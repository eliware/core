import { expect, jest, test } from "@jest/globals";

const defaultExecFile = jest.fn((command, args, ...rest) => {
  const callback = rest.at(-1);
  const stdout = command === "git" && args[0] === "rev-parse" ? `${"b".repeat(40)}\n` : "";
  callback(null, { stdout }, { stderr: "" });
});
jest.unstable_mockModule("node:child_process", () => ({ execFile: defaultExecFile }));
const createDeploymentManager = (await import("../../src/backend/deployment.mjs")).default;

const commit = "a".repeat(40);
const fixedNow = () => new Date("2026-11-18T12:00:00.000Z");

function createManager(options = {}) {
  return createDeploymentManager({ now: fixedNow, ...options });
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
  const manager = createManager({ repositoryPath: "/router/core1", run, notify });
  const started = manager.start("delivery-1");
  expect(started).toEqual({ accepted: true, runId: expect.any(String) });
  await waitFor(manager, "succeeded");
  expect(run.mock.calls.map(([command, args]) => [command, args])).toEqual([
    ["git", ["status", "--porcelain"]],
    ["git", ["rev-parse", "HEAD"]],
    ["git", ["pull", "--ff-only", "origin", "main"]],
    ["npm", ["ci"]],
    ["npm", ["test"]],
    ["npm", ["run", "preflight"]],
    ["npm", ["run", "reload"]],
  ]);
  expect(manager.getStatus().steps.map(({ name }) => name)).toEqual([
    "git pull",
    "npm ci",
    "npm test",
    "npm run preflight",
    "npm run reload",
  ]);
  expect(notify).toHaveBeenCalledWith(expect.stringContaining("succeeded"));
});

test("uses the default command adapter and clock", async () => {
  jest.useFakeTimers({ now: new Date("2026-11-18T12:00:00.000Z") });
  const manager = createDeploymentManager({ repositoryPath: "/router/core1" });
  manager.start("default-delivery");
  await waitFor(manager, "succeeded");
  expect(manager.getStatus().startedAt).toBe("2026-11-18T12:00:00.000Z");
  expect(defaultExecFile).toHaveBeenCalledWith(
    "git",
    ["pull", "--ff-only", "origin", "main"],
    expect.objectContaining({ cwd: "/router/core1", windowsHide: true }),
    expect.any(Function),
  );
  jest.useRealTimers();
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

test("records deployment failure when recovery unexpectedly rejects", async () => {
  const run = successfulRun();
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "ci") throw new Error("install failed");
    return { stdout: "" };
  });
  const manager = createManager({
    repositoryPath: "/router/core1",
    run,
    recover: jest.fn().mockRejectedValue(new Error("unexpected recovery error")),
  });
  manager.start("delivery-recovery-error");
  const status = await waitFor(manager, "failed");
  expect(status.failedStep).toBe("npm ci");
  expect(status.recovery).toBe("Recovery failed: unexpected recovery error");
});

test("records recovery rejection values without a message", async () => {
  const run = successfulRun();
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "ci") throw new Error("install failed");
    return { stdout: "" };
  });
  const manager = createManager({
    repositoryPath: "/router/core1",
    run,
    recover: jest.fn().mockRejectedValue(null),
  });
  manager.start("delivery-null-recovery-error");
  const status = await waitFor(manager, "failed");
  expect(status.recovery).toBe("Recovery failed: null");
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

test("rejects dirty repositories and reports missing repository settings", async () => {
  const unconfigured = createDeploymentManager();
  expect(unconfigured.start("delivery")).toEqual({ accepted: false, status: "unconfigured" });
  const run = jest.fn().mockResolvedValue({ stdout: " M config.json\n" });
  const manager = createManager({ repositoryPath: "/router/core1", run });
  manager.start("delivery-6");
  const status = await waitFor(manager, "failed");
  expect(status.error).toContain("uncommitted changes");
  expect(run).toHaveBeenCalledTimes(1);
});

test("reports an invalid base revision and a Discord failure", async () => {
  const run = jest.fn(async (_command, args) => {
    if (args[0] === "status") return { stdout: null };
    if (args[0] === "rev-parse") return { stdout: undefined };
    return { stdout: "" };
  });
  const manager = createManager({
    repositoryPath: "/router/core1",
    run,
    notify: jest.fn().mockRejectedValue(new Error("Discord unavailable")),
  });
  manager.start("delivery-9");
  const status = await waitFor(manager, "failed");
  await Promise.resolve();
  expect(status.failedStep).toBe("repository check");
  expect(status.error).toContain("invalid commit ID");
  expect(manager.getStatus().notificationError).toBe("Discord notification failed.");
  expect(run).toHaveBeenCalledTimes(2);
});

test("records a failed command that does not provide an error message", async () => {
  const run = successfulRun();
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "ci") throw null;
    return { stdout: "" };
  });
  const manager = createManager({ repositoryPath: "/router/core1", run });
  manager.start("delivery-10");
  const status = await waitFor(manager, "failed");
  expect(status.steps[0]).toEqual({ name: "git pull", status: "passed" });
  expect(status.steps[1]).toEqual({ name: "npm ci", status: "failed", detail: "null" });
});

test("rejects a concurrent deployment and records notification failures", async () => {
  let finishStatus;
  const run = jest.fn((command, args) => {
    if (command === "git" && args[0] === "status")
      return new Promise((resolve) => {
        finishStatus = resolve;
      });
    if (command === "git" && args[0] === "rev-parse")
      return Promise.resolve({ stdout: `${commit}\n` });
    return Promise.resolve({ stdout: "" });
  });
  const notify = jest.fn().mockRejectedValue(new Error("discord unavailable"));
  const manager = createManager({ repositoryPath: "/router/core1", run, notify });
  manager.start("delivery-7");
  expect(manager.start("delivery-8")).toEqual({ accepted: false, status: "busy" });
  finishStatus({ stdout: "" });
  const status = await waitFor(manager, "succeeded");
  expect(status.notificationError).toBe("Discord notification failed.");
});

test("records an unexpected deployment setup error", async () => {
  let calls = 0;
  const manager = createManager({
    repositoryPath: "/router/core1",
    now: () => {
      calls += 1;
      if (calls === 1) throw "clock failed";
      return fixedNow();
    },
    notify: jest.fn().mockRejectedValue(new Error("Discord unavailable")),
  });
  manager.start("delivery-11");
  await waitFor(manager, "failed");
  await Promise.resolve();
  await Promise.resolve();
  expect(manager.getStatus()).toMatchObject({
    status: "failed",
    error: "clock failed",
    finishedAt: expect.any(String),
    notificationError: "Discord notification failed.",
  });
  await Promise.resolve();
  expect(manager.start("delivery-12")).toMatchObject({ accepted: true });
  await waitFor(manager, "succeeded");
});

test("preserves worktree changes created after deployment begins", async () => {
  const run = successfulRun();
  let statusChecks = 0;
  run.mockImplementation(async (command, args) => {
    if (command === "git" && args[0] === "status") {
      statusChecks += 1;
      return { stdout: statusChecks === 1 ? "" : " M router.conf\n" };
    }
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "npm" && args[0] === "test") throw new Error("tests failed");
    return { stdout: "" };
  });
  const manager = createManager({ repositoryPath: "/router/core1", run });
  manager.start("delivery-worktree-change");
  const status = await waitFor(manager, "failed");
  expect(status.recovery).toContain("Local changes were preserved");
  expect(run).not.toHaveBeenCalledWith("git", ["reset", "--hard", commit], expect.any(Object));
});
