export default function createRestartStatusUpdater(payload) {
  const steps = payload.status.steps;
  return {
    markRestartPassed(activeStep) {
      if (activeStep) activeStep.status = "passed";
      else steps.push({ name: "restart Core service", status: "passed" });
    },
    startHealthCheck() {
      const step = { name: "check Core health after restart", status: "running" };
      steps.push(step);
      return step;
    },
    markHealthCheckPassed(step) {
      step.status = "passed";
    },
    markFailed(activeStep, error) {
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
      return activeStep;
    },
    markSucceeded(finishedAt) {
      payload.status.status = "succeeded";
      payload.status.finishedAt = finishedAt;
    },
    finish() {
      payload.status.currentStep = null;
    },
  };
}
