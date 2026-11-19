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
  await runWorker(payload, { run, checkReady, saveStatus });
  expect(run).toHaveBeenCalledWith("systemctl", ["restart", "core.service"]);
  expect(checkReady).toHaveBeenCalledWith(9300, "core.service", run);
  expect(payload.status).toMatchObject({ status: "succeeded", currentStep: null });
  expect(payload.status.steps).toEqual([
    { name: "restart Core service", status: "passed" },
    { name: "check Core health after restart", status: "passed" },
  ]);
  expect(saveStatus).toHaveBeenCalledWith(expect.objectContaining({ status: "succeeded" }));
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
  expect(payload.status.steps).toContainEqual({
    name: "check Core health after restart",
    status: "failed",
    detail: "readiness failed",
  });
  expect(payload.status.recovery).toContain("Previous commit and dependencies were restored");
});

test("applies catalog actions before persisting restart success", async () => {
  const payload = setup();
  payload.catalogActions = [{ operation: "reload", unit: "named.service" }];
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
  expect(run).toHaveBeenCalledWith(
    "systemctl",
    ["reload", "named.service"],
    expect.objectContaining({ cwd: payload.repositoryPath }),
  );
});

test("restores the previous commit and dependencies when restart fails", async () => {
  const payload = setup();
  payload.catalogActions = undefined;
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
  expect(run.mock.calls.map(([command, args]) => [command, args])).toEqual(
    expect.arrayContaining([
      ["git", ["reset", "--hard", payload.previousCommit]],
      ["npm", ["ci", "--include=dev"]],
      ["npm", ["run", "reload"]],
    ]),
  );
  expect(payload.status).toMatchObject({
    status: "failed",
    failedStep: "restart Core service",
    recovery: expect.stringContaining("Previous commit and dependencies were restored"),
  });
  expect(payload.status.steps).toContainEqual({
    name: "check Core health after rollback",
    status: "passed",
  });
});

test("reloads the previous configuration when the catalog is absent", async () => {
  const payload = setup();
  payload.catalogActions = undefined;
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
  expect(run).toHaveBeenCalledWith(
    "npm",
    ["run", "reload"],
    expect.objectContaining({ cwd: payload.repositoryPath }),
  );
});

test("reports failed recovery when Git cannot restore the previous commit", async () => {
  const payload = setup();
  const run = jest.fn(async (command, args) => {
    if (command === "systemctl" && args[0] === "restart") throw new Error("restart failed");
    if (command === "git") throw new Error("reset failed");
    return { stdout: "" };
  });
  await runRestartWorker(payload, {
    run,
    checkReady: jest.fn(),
    saveStatus: jest.fn(),
  });
  expect(payload.status.recovery).toBe("Recovery failed: reset failed");
});
