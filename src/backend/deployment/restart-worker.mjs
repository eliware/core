import notifyDeployment from "./notify.mjs";
import restore from "./restart-worker/restore.mjs";

export default async function runRestartWorker(payload, { run, checkReady, saveStatus, notify }) {
  const steps = payload.status.steps;
  let activeStep;
  try {
    activeStep = steps.findLast((step) => step.name === "restart Core service");
    await run("systemctl", ["restart", payload.serviceUnit]);
    if (activeStep) activeStep.status = "passed";
    else steps.push({ name: "restart Core service", status: "passed" });
    activeStep = { name: "check Core health after restart", status: "running" };
    steps.push(activeStep);
    await checkReady(payload.port, payload.serviceUnit, run);
    activeStep.status = "passed";
    payload.status.status = "succeeded";
    payload.status.finishedAt = new Date().toISOString();
  } catch (error) {
    const detail = String(error.message).slice(0, 300);
    if (activeStep) {
      activeStep.status = "failed";
      activeStep.detail = detail;
    } else {
      activeStep = { name: "restart Core service", status: "failed", detail };
      steps.push(activeStep);
    }
    payload.status.status = "failed";
    payload.status.failedStep = activeStep.name;
    payload.status.error = detail;
    payload.status.recovery = await restore(payload, steps, { run, checkReady });
    payload.status.finishedAt = new Date().toISOString();
  }
  payload.status.currentStep = null;
  await notifyDeployment({
    status: {
      get: () => payload.status,
      update: (patch) => Object.assign(payload.status, patch),
    },
    notify,
    branch: payload.branch,
    githubPayload: payload.githubPayload,
  });
  saveStatus(payload.status);
}
