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
  expect(manager.start("next-delivery")).toEqual({ accepted: false, status: "busy" });
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

test("reports a lock release failure after deployment completion", async () => {
  const run = jest.fn(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    return { stdout: "" };
  });
  const manager = createManager({
    repositoryPath: "/router/config",
    acquireLock: () => () => {
      throw "lock release failed";
    },
    notify: jest.fn().mockRejectedValue(new Error("Discord unavailable")),
    now: () => new Date("2026-11-18T12:00:00.000Z"),
    run,
  });

  manager.start("push");
  for (let attempt = 0; attempt < 100 && manager.getStatus().status !== "succeeded"; attempt += 1)
    await Promise.resolve();
  for (let attempt = 0; attempt < 20 && !manager.getStatus().notificationError; attempt += 1)
    await Promise.resolve();

  expect(manager.getStatus().status).toBe("succeeded");
  expect(manager.getStatus().lockReleaseError).toBe("Deployment lock cleanup failed.");
  expect(manager.getStatus().notificationError).toBe("Discord notification failed.");
  expect(manager.start("next-push")).toEqual({ accepted: false, status: "busy" });
});

test("reports unexpected deployment setup failures", async () => {
  const manager = createManager({
    repositoryPath: "/router/config",
    now: () => {
      throw new Error("clock unavailable");
    },
  });

  manager.start("push");
  for (let attempt = 0; attempt < 100 && !manager.getStatus().error; attempt += 1)
    await Promise.resolve();

  expect(manager.getStatus()).toMatchObject({
    status: "failed",
    error: "clock unavailable",
  });
});

test("rejects deployment from an unconfigured or unexpected branch", async () => {
  expect(createDeploymentManager().start("push")).toEqual({
    accepted: false,
    status: "unconfigured",
  });
  for (const currentBranch of ["release", ""]) {
    const run = jest.fn(async (_command, args) =>
      args[0] === "branch" ? { stdout: currentBranch } : { stdout: "" },
    );
    const manager = createManager({ repositoryPath: "/router/config", run, currentBranch });

    manager.start("push");
    expect((await waitFor(manager, "failed")).error).toContain("must be on branch main");
    expect(run).toHaveBeenCalledTimes(2);
  }
});

test("rejects dirty repositories and invalid base revisions", async () => {
  const dirtyRun = jest.fn().mockResolvedValue({ stdout: " M config.json\n" });
  const dirty = createManager({ repositoryPath: "/router/config", run: dirtyRun });
  dirty.start("dirty-push");
  expect((await waitFor(dirty, "failed")).error).toContain("uncommitted changes");
  expect(dirtyRun).toHaveBeenCalledTimes(1);

  const revisionRun = jest.fn(async (_command, args) => {
    if (args[0] === "status") return { stdout: null };
    if (args[0] === "rev-parse") return { stdout: undefined };
    return { stdout: "" };
  });
  const revision = createManager({
    repositoryPath: "/router/config",
    run: revisionRun,
    notify: jest.fn().mockRejectedValue(new Error("Discord unavailable")),
  });
  revision.start("bad-revision");
  expect((await waitFor(revision, "failed")).error).toContain("invalid commit ID");
  await Promise.resolve();
  expect(revision.getStatus().notificationError).toBe("Discord notification failed.");
});
