import notifyDeployment from "./notify.mjs";
import restore from "./restart-worker/restore.mjs";
import createRestartStatusUpdater from "./restart-worker/status.mjs";

export default async function runRestartWorker(payload, { run, checkReady, saveStatus, notify }) {
  const steps = payload.status.steps;
  const status = createRestartStatusUpdater(payload);
  let activeStep;
  try {
    activeStep = steps.findLast((step) => step.name === "restart Core service");
    await saveStatus(payload.status);
    await run("systemctl", ["restart", payload.serviceUnit]);
    status.markRestartPassed(activeStep);
    activeStep = status.startHealthCheck();
    await checkReady(payload.port, payload.serviceUnit, run);
    status.markHealthCheckPassed(activeStep);
    status.markSucceeded(new Date().toISOString());
  } catch (error) {
    activeStep = status.markFailed(activeStep, error);
    payload.status.recovery = await restore(payload, steps, { run, checkReady });
    payload.status.finishedAt = new Date().toISOString();
  }
  status.finish();
  await saveStatusSafely(saveStatus, payload.status);
  await notifyDeployment({
    status: {
      get: () => payload.status,
      update: (patch) => Object.assign(payload.status, patch),
    },
    notify,
    branch: payload.branch,
    githubPayload: payload.githubPayload,
  });
  await saveStatusSafely(saveStatus, payload.status);
}

async function saveStatusSafely(saveStatus, status) {
  try {
    await saveStatus(status);
  } catch (error) {
    console.error("Core could not save the final deployment status.", error);
  }
}
