import { expect, jest, test } from "@jest/globals";
import catalog from "../../../test-fixtures/deployment-catalog.mjs";

jest.unstable_mockModule("node:child_process", () => ({ execFile: jest.fn() }));
const createDeploymentManager = (await import("../../../src/backend/deployment.mjs")).default;
const commit = "a".repeat(40);
const fixedNow = () => new Date("2026-11-18T12:00:00.000Z");

function createManager(options = {}) {
  const { currentBranch = "main", ...managerOptions } = options;
  if (managerOptions.run) {
    const run = managerOptions.run;
    managerOptions.run = async (command, args, runOptions) => {
      const result = await run(command, args, runOptions);
      return command === "git" && args[0] === "branch"
        ? { ...result, stdout: `${currentBranch}\n` }
        : result;
    };
  }
  return createDeploymentManager({
    now: fixedNow,
    acquireLock: () => () => {},
    readVersion: jest.fn().mockResolvedValue(null),
    ...managerOptions,
  });
}

function successfulRun() {
  return jest.fn(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    return { stdout: "" };
  });
}

test("keeps deployment pending while the updated Core worker restarts the service", async () => {
  const scheduleRestart = jest.fn().mockResolvedValue(undefined);
  const readVersion = jest.fn().mockResolvedValueOnce("15.2.2").mockResolvedValueOnce("15.2.3");
  const manager = createManager({
    repositoryPath: "/router/core",
    run: successfulRun(),
    readVersion,
    scheduleRestart,
  });
  manager.start("core-version-update");
  for (let index = 0; index < 1000 && !scheduleRestart.mock.calls.length; index += 1)
    await Promise.resolve();
  expect(scheduleRestart).toHaveBeenCalledTimes(1);
  expect(manager.getStatus()).toMatchObject({
    status: "running",
    currentStep: "restart Core service",
  });
});

async function waitFor(manager, status) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (manager.getStatus().status === status) return manager.getStatus();
    await Promise.resolve();
  }
  throw new Error(`Deployment did not reach ${status}: ${JSON.stringify(manager.getStatus())}`);
}

test("restores the prior commit when a deployment step changes the worktree", async () => {
  const run = successfulRun();
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "test") throw new Error("tests failed");
    return { stdout: "" };
  });
  const manager = createManager({
    repositoryPath: "/router/core1",
    run,
    acquireLock: () => () => {},
  });
  manager.start("delivery-worktree-change");
  const status = await waitFor(manager, "failed");
  expect(status.recovery).toBeUndefined();
  expect(run).toHaveBeenCalledWith("git", ["reset", "--hard", commit], expect.any(Object));
  expect(run).not.toHaveBeenCalledWith("git", ["clean", "-fd"], expect.any(Object));
});
test("restores the previous commit and skips reload when a preflight step fails", async () => {
  const run = successfulRun();
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "test") throw new Error("tests failed");
    return { stdout: "" };
  });
  const manager = createManager({ repositoryPath: "/router/core1", run, catalog });
  manager.start("delivery-2");
  const status = await waitFor(manager, "failed");
  expect(status.failedStep).toBe("npm test");
  expect(run).toHaveBeenCalledWith("git", ["reset", "--hard", commit], expect.any(Object));
  expect(run).not.toHaveBeenCalledWith("npm", ["run", "reload"], expect.any(Object));
});

test("reloads restored configuration when the new reload fails", async () => {
  const run = successfulRun();
  let reloadCount = 0;
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "run" && args[1] === "reload") {
      reloadCount += 1;
      if (reloadCount === 1) throw new Error("reload failed");
    }
    return { stdout: "" };
  });
  const manager = createManager({ repositoryPath: "/router/core1", run });
  manager.start("delivery-3");
  const status = await waitFor(manager, "failed");
  expect(status.failedStep).toBe("npm run reload");
  expect(reloadCount).toBe(2);
  expect(status.steps.at(-1)).toEqual({ name: "reload previous configuration", status: "passed" });
});

test("reports rollback failure after a deployment error", async () => {
  const run = successfulRun();
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "ci") throw new Error("install failed");
    if (command === "git" && args[0] === "reset") throw "reset failed";
    return { stdout: "" };
  });
  const manager = createManager({ repositoryPath: "/router/core1", run });
  manager.start("delivery-4");
  const status = await waitFor(manager, "failed");
  expect(status.recovery).toContain("restore failed");
  expect(status.steps.at(-1)).toEqual({ name: "restore previous commit", status: "failed" });
});

test.each([
  { recoveryError: new Error("unexpected recovery error"), expected: "unexpected recovery error" },
  { recoveryError: null, expected: "null" },
])("records deployment failure when recovery rejects", async ({ recoveryError, expected }) => {
  const run = successfulRun();
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "ci") throw new Error("install failed");
    return { stdout: "" };
  });
  const manager = createManager({
    repositoryPath: "/router/core1",
    run,
    recover: jest.fn().mockRejectedValue(recoveryError),
  });
  manager.start("delivery-recovery-error");
  const status = await waitFor(manager, "failed");
  expect(status.failedStep).toBe("npm ci --include=dev");
  expect(status.recovery).toBe(`Recovery failed: ${expected}`);
});

test("reports a failed reload of the restored configuration", async () => {
  const run = successfulRun();
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "run" && args[1] === "reload") throw "reload failed";
    return { stdout: "" };
  });
  const manager = createManager({ repositoryPath: "/router/core1", run });
  manager.start("delivery-5");
  const status = await waitFor(manager, "failed");
  expect(status.recovery).toContain("its reload failed");
});
