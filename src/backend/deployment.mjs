import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { createSnowflakeGenerator } from "@eliware/common";
import recoverDeployment from "./deployment/recovery.mjs";
import createDeploymentStatus from "./deployment/status.mjs";
import acquireDeploymentLock from "./deployment/lock.mjs";
import reportSetupFailure from "./deployment/setup-failure.mjs";
import createDeploymentAdmission from "./deployment/admission.mjs";
import createFailureStatus from "./deployment/failure-status.mjs";
import notifyDeployment from "./deployment/notify.mjs";
import createDeploymentOperations from "./deployment/operations.mjs";
import loadServiceCatalog from "../service-catalog/load.mjs";
import readCoreVersion from "./deployment/core/version.mjs";
import restartCoreAfterUpdate from "./deployment/core/restart.mjs";
import prepareDeployment from "./deployment/prepare-deployment.mjs";
import scheduleCoreRestart from "./deployment/schedule-restart.mjs";
import createPersistedStatus from "./deployment/persisted-status.mjs";

const execFile = promisify(nodeExecFile);
export default function createDeploymentManager({
  repositoryPath,
  branch = "main",
  notify = async () => {},
  run = (command, args, options) => execFile(command, args, { ...options, windowsHide: true }),
  recover = recoverDeployment,
  now = () => new Date(),
  createRunId,
  snowflake = {},
  acquireLock = acquireDeploymentLock,
  loadCatalog = loadServiceCatalog,
  readVersion = readCoreVersion,
  scheduleRestart = scheduleCoreRestart,
  serviceUnit = "core.service",
  dashboardPort = 9300,
} = {}) {
  const persistedStatus = createPersistedStatus(repositoryPath);
  const status = createDeploymentStatus(
    persistedStatus.load(),
    persistedStatus.save,
    persistedStatus.load,
  );
  const generateRunId = createRunId ?? createSnowflakeGenerator(snowflake);
  const admit = createDeploymentAdmission({
    repositoryPath,
    generateRunId,
    acquireLock,
    reportSetupFailure: (error, event, runId, githubPayload) =>
      reportSetupFailure({ error, event, runId, githubPayload, branch, status, notify, now }),
  });
  async function execute(event, runId, releaseLock, githubPayload) {
    let startedAt;
    const steps = [];
    const deploymentState = { reloadStarted: false };
    const releaseLockSafely = () => {
      try {
        releaseLock?.();
      } catch {
        status.update({ lockReleaseError: "Deployment lock cleanup failed." });
      }
    };
    const operations = createDeploymentOperations({ repositoryPath, run, steps, status });
    try {
      startedAt = now().toISOString();
      status.set({ runId, event, status: "running", startedAt, finishedAt: null, steps });
      await prepareDeployment({
        repositoryPath,
        branch,
        run,
        readVersion,
        loadCatalog,
        runStep: operations.step,
        verifyCleanWorktree: operations.verifyCleanWorktree,
        steps,
        state: deploymentState,
        onStart: operations.onStart,
      });
      const restartScheduled = await restartCoreAfterUpdate({
        previousVersion: deploymentState.previousCoreVersion,
        readVersion,
        scheduleRestart,
        run,
        runId,
        repositoryPath,
        previousCommit: deploymentState.previousCommit,
        catalogActions: deploymentState.catalogActions,
        status,
        serviceUnit,
        port: dashboardPort,
        branch,
        githubPayload,
      });
      if (restartScheduled) {
        releaseLockSafely();
        return;
      }
      const finishedAt = now().toISOString();
      status.set({
        ...status.get(),
        runId,
        event,
        status: "succeeded",
        startedAt,
        finishedAt,
        steps,
      });
      releaseLockSafely();
      await notifyDeployment({ status, notify, branch, githubPayload });
    } catch (error) {
      let recovery;
      if (deploymentState.previousCommit) {
        try {
          recovery = await recover({
            run,
            repositoryPath,
            previousCommit: deploymentState.previousCommit,
            reloadStarted: deploymentState.reloadStarted,
            steps,
            ...(deploymentState.catalogActions !== undefined
              ? { catalogActions: deploymentState.catalogActions }
              : {}),
          });
        } catch (recoveryError) {
          recovery = `Recovery failed: ${String(recoveryError?.message ?? recoveryError).slice(0, 200)}`;
          steps.push({ name: "restore previous commit", status: "failed" });
        }
      }
      status.set(
        createFailureStatus({
          error,
          event,
          runId,
          recovery,
          startedAt,
          steps,
          now,
        }),
      );
      releaseLockSafely();
      await notifyDeployment({ status, notify, branch, githubPayload });
    } finally {
      releaseLockSafely();
    }
  }
  return { start: (event, payload) => admit(event, execute, payload), getStatus: status.get };
}
