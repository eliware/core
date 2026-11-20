import { expect, test } from "@jest/globals";
import createRestartStatusUpdater from "../../../../src/backend/deployment/restart-worker/status.mjs";

test("records successful restart and health steps", () => {
  const payload = { status: { steps: [] } };
  const status = createRestartStatusUpdater(payload);
  status.markRestartPassed();
  const healthStep = status.startHealthCheck();
  status.markHealthCheckPassed(healthStep);
  status.markSucceeded("2026-11-20T12:00:00.000Z");
  status.finish();

  expect(payload.status).toEqual({
    steps: [
      { name: "restart Core service", status: "passed" },
      { name: "check Core health after restart", status: "passed" },
    ],
    status: "succeeded",
    finishedAt: "2026-11-20T12:00:00.000Z",
    currentStep: null,
  });
});

test("records a bounded failure on the active step", () => {
  const payload = { status: { steps: [] } };
  const status = createRestartStatusUpdater(payload);
  const step = status.startHealthCheck();
  expect(status.markFailed(step, new Error("readiness failed"))).toBe(step);
  expect(payload.status).toMatchObject({
    status: "failed",
    failedStep: "check Core health after restart",
    error: "readiness failed",
  });
  expect(step).toMatchObject({ status: "failed", detail: "readiness failed" });
});
