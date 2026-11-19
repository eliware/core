import { expect, jest, test } from "@jest/globals";
import runRestartWorker from "../../../src/backend/deployment/restart-worker.mjs";

function setup() {
  return {
    repositoryPath: "/router/core",
    previousCommit: "a".repeat(40),
    catalogActions: [],
    serviceUnit: "core.service",
    port: 9300,
    status: {
      runId: "123",
      status: "running",
      steps: [{ name: "restart Core service", status: "running" }],
    },
  };
}

function runWorker(payload, dependencies) {
  return runRestartWorker(payload, { notify: jest.fn(), ...dependencies });
}

test("restarts Core, checks readiness, and persists success", async () => {
  const payload = setup();
  const run = jest.fn().mockResolvedValue({ stdout: "" });
  const checkReady = jest.fn().mockResolvedValue(undefined);
  const saveStatus = jest.fn();
  const notify = jest.fn().mockRejectedValue(new Error("notification unavailable"));
  await runWorker(payload, { run, checkReady, saveStatus, notify });
  expect(run).toHaveBeenCalledWith("systemctl", ["restart", "core.service"]);
  expect(checkReady).toHaveBeenCalledWith(9300, "core.service", run);
  expect(payload.status).toMatchObject({ status: "succeeded", currentStep: null });
  expect(payload.status.steps).toEqual([
    { name: "restart Core service", status: "passed" },
    { name: "check Core health after restart", status: "passed" },
  ]);
  expect(saveStatus).toHaveBeenCalledWith(expect.objectContaining({ status: "succeeded" }));
  expect(saveStatus).toHaveBeenCalledTimes(3);
  expect(saveStatus.mock.invocationCallOrder[0]).toBeLessThan(run.mock.invocationCallOrder[0]);
  expect(saveStatus.mock.invocationCallOrder[1]).toBeLessThan(notify.mock.invocationCallOrder[0]);
  expect(payload.status.notificationError).toBe("Discord notification failed.");
});

test("records restart success when no pending status step exists", async () => {
  const payload = setup();
  payload.status.steps = [];
  await runWorker(payload, {
    run: jest.fn().mockResolvedValue({ stdout: "" }),
    checkReady: jest.fn().mockResolvedValue(undefined),
    saveStatus: jest.fn(),
  });
  expect(payload.status.steps.map(({ status }) => status)).toEqual(["passed", "passed"]);
});

test("records restart failure when no pending status step exists", async () => {
  const payload = setup();
  payload.status.steps = [];
  const run = jest.fn(async (command, args) => {
    if (command === "systemctl" && args[0] === "restart" && run.mock.calls.length === 1)
      throw new Error("restart failed");
    return { stdout: "" };
  });
  await runWorker(payload, {
    run,
    checkReady: jest.fn().mockResolvedValue(undefined),
    saveStatus: jest.fn(),
  });
  expect(payload.status.steps[0]).toMatchObject({
    name: "restart Core service",
    status: "failed",
    detail: "restart failed",
  });
});

test("restores the old package after Core fails its readiness check", async () => {
  const payload = setup();
  const run = jest.fn().mockResolvedValue({ stdout: "" });
  await runWorker(payload, {
    run,
    checkReady: jest
      .fn()
      .mockRejectedValueOnce(new Error("readiness failed"))
      .mockResolvedValue(undefined),
    saveStatus: jest.fn(),
  });
  expect(payload.status).toMatchObject({
    status: "failed",
    failedStep: "check Core health after restart",
  });
});
