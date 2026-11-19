import runCatalogActions from "./catalog-actions.mjs";
import notifyDeployment from "./notify.mjs";

async function restore(payload, steps, { run, checkReady }) {
  try {
    await run("git", ["reset", "--hard", payload.previousCommit], { cwd: payload.repositoryPath });
    steps.push({ name: "restore previous commit", status: "passed" });
    await run("npm", ["ci", "--include=dev"], { cwd: payload.repositoryPath, timeout: 900_000 });
    steps.push({ name: "restore previous dependencies", status: "passed" });
    if (Array.isArray(payload.catalogActions)) {
      await runCatalogActions({
        actions: payload.catalogActions,
        repositoryPath: payload.repositoryPath,
        run,
        steps,
        onStart: () => {},
        prefix: "restore ",
      });
    } else {
      await run("npm", ["run", "reload"], { cwd: payload.repositoryPath, timeout: 900_000 });
      steps.push({ name: "reload previous configuration", status: "passed" });
    }
    await run("systemctl", ["restart", payload.serviceUnit]);
    steps.push({ name: "restart Core with previous version", status: "passed" });
    await checkReady(payload.port, payload.serviceUnit, run);
    steps.push({ name: "check Core health after rollback", status: "passed" });
    return "Previous commit and dependencies were restored, and Core passed its health check.";
  } catch (error) {
    steps.push({
      name: "restore Core after failed restart",
      status: "failed",
      detail: String(error.message).slice(0, 300),
    });
    return `Recovery failed: ${String(error.message).slice(0, 200)}`;
  }
}

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
