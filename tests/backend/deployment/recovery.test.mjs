import { expect, jest, test } from "@jest/globals";
import recoverDeployment from "../../../src/backend/deployment/recovery.mjs";

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
  return createDeploymentManager({ now: fixedNow, acquireLock: () => () => {}, ...managerOptions });
}

function successfulRun() {
  return jest.fn(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    return { stdout: "" };
  });
}

async function waitFor(manager, status) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (manager.getStatus().status === status) return manager.getStatus();
    await Promise.resolve();
  }
  throw new Error(`Deployment did not reach ${status}: ${JSON.stringify(manager.getStatus())}`);
}

test("restores the prior commit without reloading when reload has not started", async () => {
  const steps = [];
  const run = jest.fn().mockResolvedValue({});
  await expect(
    recoverDeployment({ run, repositoryPath: "/router", previousCommit: "abc", steps }),
  ).resolves.toBeUndefined();
  expect(run).toHaveBeenCalledWith("git", ["reset", "--hard", "abc"], { cwd: "/router" });
  expect(run).not.toHaveBeenCalledWith("git", ["clean", "-fd"], { cwd: "/router" });
  expect(steps).toEqual([{ name: "restore previous commit", status: "passed" }]);
});

test("reloads restored configuration after an unsuccessful deployment reload", async () => {
  const steps = [];
  const run = jest.fn().mockResolvedValue({});
  await expect(
    recoverDeployment({
      run,
      repositoryPath: "/router",
      previousCommit: "abc",
      reloadStarted: true,
      steps,
    }),
  ).resolves.toBeUndefined();
  expect(steps.at(-1)).toEqual({ name: "reload previous configuration", status: "passed" });
});

test("reports reset and restored reload failures", async () => {
  const resetSteps = [];
  await expect(
    recoverDeployment({
      run: jest.fn().mockRejectedValue(new Error("reset denied")),
      repositoryPath: "/router",
      previousCommit: "abc",
      steps: resetSteps,
    }),
  ).resolves.toContain("restore failed: reset denied");
  expect(resetSteps).toEqual([{ name: "restore previous commit", status: "failed" }]);

  const reloadSteps = [];
  await expect(
    recoverDeployment({
      run: jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("reload denied")),
      repositoryPath: "/router",
      previousCommit: "abc",
      reloadStarted: true,
      steps: reloadSteps,
    }),
  ).resolves.toBe("Previous commit restored, but its reload failed.");
  expect(reloadSteps.at(-1)).toMatchObject({ status: "failed", detail: "reload denied" });
});

test("does not reload when commit restoration fails after a deployment reload", async () => {
  const run = jest.fn().mockRejectedValue(new Error("reset denied"));
  const steps = [];
  await expect(
    recoverDeployment({
      run,
      repositoryPath: "/router",
      previousCommit: "abc",
      reloadStarted: true,
      steps,
    }),
  ).resolves.toContain("Previous commit restore failed: reset denied");
  expect(run).toHaveBeenCalledTimes(1);
  expect(steps).toEqual([{ name: "restore previous commit", status: "failed" }]);
});

test("preserves untracked files while restoring the prior commit", async () => {
  const run = jest.fn().mockResolvedValue({});
  await recoverDeployment({ run, repositoryPath: "/router", previousCommit: "abc", steps: [] });
  expect(run.mock.calls.map(([, args]) => args)).toEqual([["reset", "--hard", "abc"]]);
});

test("restores the previous commit and skips reload when a preflight step fails", async () => {
  const run = successfulRun();
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "test") throw new Error("tests failed");
    return { stdout: "" };
  });
  const manager = createManager({ repositoryPath: "/router/core1", run });
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
