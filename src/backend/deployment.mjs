import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { createSnowflakeGenerator } from "@eliware/common";
import runDeploymentStep from "./deployment/step.mjs";
import recoverDeployment from "./deployment/recovery.mjs";
import createDeploymentStatus from "./deployment/status.mjs";
import acquireDeploymentLock from "./deployment/lock.mjs";
import reportSetupFailure from "./deployment/setup-failure.mjs";
import createDeploymentAdmission from "./deployment/admission.mjs";
import createFailureStatus from "./deployment/failure-status.mjs";
import createDeploymentDiscordNotification from "./deployment/discord-notification.mjs";
import verifyDeploymentWorktree from "./deployment/worktree.mjs";
import validateDeploymentRepository from "./deployment/validate-repository.mjs";

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
} = {}) {
  const status = createDeploymentStatus();
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
    let previousCommit;
    let reloadStarted = false;
    const releaseLockSafely = () => {
      try {
        releaseLock?.();
      } catch {
        status.update({ lockReleaseError: "Deployment lock cleanup failed." });
      }
    };
    const step = (name, command, args) =>
      runDeploymentStep({
        name,
        command,
        args,
        repositoryPath,
        run,
        steps,
        onStart: (currentStep, priorSteps) =>
          status.update({ currentStep, steps: structuredClone(priorSteps) }),
      });
    const verifyCleanWorktree = (afterStep) =>
      verifyDeploymentWorktree({
        afterStep,
        repositoryPath,
        run,
        steps,
        onStart: (currentStep, priorSteps) =>
          status.update({ currentStep, steps: structuredClone(priorSteps) }),
      });
    try {
      startedAt = now().toISOString();
      status.set({ runId, event, status: "running", startedAt, finishedAt: null, steps });
      previousCommit = await validateDeploymentRepository({ run, repositoryPath, branch });
      await step("git pull", "git", ["pull", "--ff-only", "--", "origin", branch]);
      await verifyCleanWorktree("git pull");
      await step("npm ci --include=dev", "npm", ["ci", "--include=dev"]);
      await verifyCleanWorktree("npm ci --include=dev");
      await step("npm test", "npm", ["test"]);
      await verifyCleanWorktree("npm test");
      await step("npm run preflight", "npm", ["run", "preflight"]);
      await verifyCleanWorktree("npm run preflight");
      reloadStarted = true;
      await step("npm run reload", "npm", ["run", "reload"]);
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
      try {
        await notify(
          createDeploymentDiscordNotification({
            ...status.get(),
            branch,
            githubPayload,
          }),
        );
      } catch {
        status.update({ notificationError: "Discord notification failed." });
      }
      return { accepted: true, runId };
    } catch (error) {
      let recovery;
      if (previousCommit) {
        try {
          recovery = await recover({ run, repositoryPath, previousCommit, reloadStarted, steps });
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
      try {
        await notify(
          createDeploymentDiscordNotification({
            ...status.get(),
            branch,
            githubPayload,
          }),
        );
      } catch {
        status.update({ notificationError: "Discord notification failed." });
      }
      return { accepted: true, runId };
    } finally {
      releaseLockSafely();
    }
  }
  function start(event, githubPayload) {
    return admit(event, execute, githubPayload);
  }
  return { start, getStatus: status.get };
}
