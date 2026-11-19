import createFailureStatus from "./failure-status.mjs";
import notifyDeployment from "./notify.mjs";
import createDeploymentOperations from "./operations.mjs";
import prepareDeployment from "./prepare-deployment.mjs";
import restartCoreAfterUpdate from "./core/restart.mjs";

export default async function executeDeployment({
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
}) {
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
    status.set(createFailureStatus({ error, event, runId, recovery, startedAt, steps, now }));
    releaseLockSafely();
    await notifyDeployment({ status, notify, branch, githubPayload });
  } finally {
    releaseLockSafely();
  }
}
