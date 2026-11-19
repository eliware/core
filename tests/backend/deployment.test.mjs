import { expect, jest, test } from "@jest/globals";

const defaultExecFile = jest.fn((command, args, ...rest) => {
  const callback = rest.at(-1);
  const stdout =
    command === "git" && args[0] === "branch"
      ? "main\n"
      : command === "git" && args[0] === "rev-parse"
        ? `${"b".repeat(40)}\n`
        : "";
  callback(null, { stdout }, { stderr: "" });
});
jest.unstable_mockModule("node:child_process", () => ({ execFile: defaultExecFile }));
const createDeploymentManager = (await import("../../src/backend/deployment.mjs")).default;

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
  return createDeploymentManager({ now: fixedNow, ...managerOptions });
}

function successfulRun() {
  const run = jest.fn(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    return { stdout: "" };
  });
  return run;
}

async function waitFor(manager, status) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (manager.getStatus().status === status) return manager.getStatus();
    await Promise.resolve();
  }
  throw new Error(`Deployment did not reach ${status}: ${JSON.stringify(manager.getStatus())}`);
}

test("runs the deployment steps in order and records success", async () => {
  const run = successfulRun();
  const notify = jest.fn();
  const manager = createManager({
    repositoryPath: "/router/core1",
    run,
    notify,
    acquireLock: () => () => {
      throw new Error("lock cleanup failed");
    },
  });
  const started = manager.start("delivery-1");
  expect(started).toEqual({ accepted: true, runId: expect.any(String) });
  await waitFor(manager, "succeeded");
  expect(run.mock.calls.map(([command, args]) => [command, args])).toEqual([
    ["git", ["status", "--porcelain"]],
    ["git", ["branch", "--show-current"]],
    ["git", ["rev-parse", "HEAD"]],
    ["git", ["pull", "--ff-only", "--", "origin", "main"]],
    ["git", ["status", "--porcelain"]],
    ["npm", ["ci", "--include=dev"]],
    ["git", ["status", "--porcelain"]],
    ["npm", ["test"]],
    ["git", ["status", "--porcelain"]],
    ["npm", ["run", "preflight"]],
    ["git", ["status", "--porcelain"]],
    ["npm", ["run", "reload"]],
  ]);
  expect(manager.getStatus().steps.map(({ name }) => name)).toEqual([
    "git pull",
    "git status after git pull",
    "npm ci --include=dev",
    "git status after npm ci --include=dev",
    "npm test",
    "git status after npm test",
    "npm run preflight",
    "git status after npm run preflight",
    "npm run reload",
  ]);
  expect(manager.getStatus().lockReleaseError).toBe("Deployment lock cleanup failed.");
  expect(manager.start("next-delivery")).toMatchObject({
    accepted: true,
    runId: expect.any(String),
  });
});

test("uses the default command adapter and clock", async () => {
  jest.useFakeTimers({ now: new Date("2026-11-18T12:00:00.000Z") });
  const manager = createDeploymentManager({ repositoryPath: "/router/core1" });
  manager.start("default-delivery");
  await waitFor(manager, "succeeded");
  expect(manager.getStatus().startedAt).toBe("2026-11-18T12:00:00.000Z");
  expect(defaultExecFile).toHaveBeenCalledWith(
    "git",
    ["pull", "--ff-only", "--", "origin", "main"],
    expect.objectContaining({ cwd: "/router/core1", windowsHide: true }),
    expect.any(Function),
  );
  jest.useRealTimers();
});

test.each(["branch", "rev-parse"])("stops when git %s exits nonzero", async (operation) => {
  const run = successfulRun();
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === operation)
      return { stdout: operation === "branch" ? "main\n" : `${commit}\n`, code: 1 };
    return { stdout: "" };
  });
  const manager = createManager({ repositoryPath: "/router/core", run });
  manager.start(`${operation}-error`);
  const status = await waitFor(manager, "failed");
  expect(status.error).toMatch(/branch|commit ID/u);
  expect(run.mock.calls.some(([, args]) => args[0] === "pull")).toBe(false);
});

test("rejects an initial git status command with a nonzero result", async () => {
  const run = jest.fn().mockResolvedValue({ stdout: "", status: 1 });
  const manager = createManager({
    repositoryPath: "/router/core1",
    run,
    acquireLock: () => () => {},
  });

  manager.start("failed-initial-status");
  const status = await waitFor(manager, "failed");

  expect(status.failedStep).toBe("repository check");
  expect(status.error).toBe("Git status exited with code 1.");
  expect(run).toHaveBeenCalledTimes(1);
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

test("reloads the restored configuration when the new reload fails", async () => {
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

test("rejects concurrent deployments for one repository and records notification failures", async () => {
  let finishStatus;
  let firstStatus = true;
  const run = jest.fn((command, args) => {
    if (command === "git" && args[0] === "status" && firstStatus) {
      firstStatus = false;
      return new Promise((resolve) => {
        finishStatus = resolve;
      });
    }
    if (command === "git" && args[0] === "status") return Promise.resolve({ stdout: "" });
    if (command === "git" && args[0] === "rev-parse")
      return Promise.resolve({ stdout: `${commit}\n` });
    return Promise.resolve({ stdout: "" });
  });
  const notify = jest.fn().mockRejectedValue(new Error("discord unavailable"));
  const manager = createManager({ repositoryPath: "/router/core1", run, notify });
  manager.start("delivery-7");
  expect(manager.start("delivery-8")).toEqual({ accepted: false, status: "busy" });
  expect(createManager({ repositoryPath: "/router/core1" }).start("delivery-9")).toEqual({
    accepted: false,
    status: "busy",
  });
  finishStatus({ stdout: "" });
  await waitFor(manager, "succeeded");
  for (let attempt = 0; attempt < 20 && !manager.getStatus().notificationError; attempt += 1)
    await Promise.resolve();
  expect(manager.getStatus().notificationError).toBe("Discord notification failed.");
});

test("releases deployment state while setup failure notification is pending", async () => {
  let calls = 0;
  let notificationCount = 0;
  const notify = jest.fn(() => {
    notificationCount += 1;
    if (notificationCount === 1) return new Promise(() => {});
    return Promise.resolve();
  });
  const manager = createManager({
    repositoryPath: "/router/one",
    now: () => {
      calls += 1;
      if (calls === 1) throw "clock failed";
      return fixedNow();
    },
    notify,
  });
  manager.start("delivery-11");
  const failed = await waitFor(manager, "failed");
  await Promise.resolve();
  await Promise.resolve();
  expect(failed).toMatchObject({
    status: "failed",
    error: "clock failed",
    finishedAt: expect.any(String),
  });
  expect(manager.start("delivery-12")).toMatchObject({ accepted: true });
  await waitFor(manager, "succeeded");
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
