import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { createSnowflakeGenerator } from "@eliware/common";
import recoverDeployment from "./deployment/recovery.mjs";
import createDeploymentStatus from "./deployment/status.mjs";
import acquireDeploymentLock from "./deployment/lock.mjs";
import reportSetupFailure from "./deployment/setup-failure.mjs";
import createDeploymentAdmission from "./deployment/admission.mjs";
import loadServiceCatalog from "../service-catalog/load.mjs";
import readCoreVersion from "./deployment/core/version.mjs";
import scheduleCoreRestart from "./deployment/schedule-restart.mjs";
import createPersistedStatus from "./deployment/persisted-status.mjs";
import executeDeployment from "./deployment/execute.mjs";

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
  const execute = (event, runId, releaseLock, githubPayload) =>
    executeDeployment({
      event,
      runId,
      releaseLock,
      githubPayload,
      repositoryPath,
      branch,
      run,
      recover,
      now,
      readVersion,
      loadCatalog,
      scheduleRestart,
      serviceUnit,
      dashboardPort,
      status,
      notify,
    });
  return { start: (event, payload) => admit(event, execute, payload), getStatus: status.get };
}
