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
  return createDeploymentManager({
    now: fixedNow,
    acquireLock: () => () => {},
    readVersion: jest.fn().mockResolvedValue(null),
    ...managerOptions,
  });
}
function successfulRun() {
  const run = jest.fn(async (command, args) => {
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    return { stdout: "" };
  });
  return run;
}
async function waitFor(manager, status) {
  for (let attempt = 0; attempt < 1000; attempt += 1)
    if (manager.getStatus().status === status) return manager.getStatus();
    else await Promise.resolve();
  throw new Error(`Deployment did not reach ${status}: ${JSON.stringify(manager.getStatus())}`);
}
test("keeps lock cleanup and busy state at the deployment coordination boundary", async () => {
  const run = successfulRun();
  const notify = jest.fn();
  const scheduleRestart = jest.fn().mockResolvedValue(undefined);
  const readVersion = jest.fn().mockResolvedValueOnce("15.2.0").mockResolvedValueOnce("15.2.1");
  const manager = createManager({
    repositoryPath: "/router/core1",
    run,
    notify,
    readVersion,
    scheduleRestart,
    acquireLock: () => () => {
      throw new Error("lock cleanup failed");
    },
  });
  const started = manager.start("delivery-1");
  expect(started).toEqual({ accepted: true, runId: expect.any(String) });
  for (let attempt = 0; attempt < 100 && !scheduleRestart.mock.calls.length; attempt += 1)
    await Promise.resolve();
  for (let attempt = 0; attempt < 100 && !manager.getStatus().lockReleaseError; attempt += 1)
    await Promise.resolve();
  expect(scheduleRestart).toHaveBeenCalled();
  expect(manager.getStatus().lockReleaseError).toBe("Deployment lock cleanup failed.");
  expect(manager.start("next-delivery")).toEqual({ accepted: false, status: "busy" });
});
test("uses the default command adapter and clock", async () => {
  jest.useFakeTimers({ now: new Date("2026-11-18T12:00:00.000Z") });
  const manager = createDeploymentManager({
    repositoryPath: "/router/core1",
    readVersion: jest.fn().mockResolvedValue(null),
  });
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

test("uses the default installed Core version reader", async () => {
  expect(createDeploymentManager().start("push").status).toBe("unconfigured");
  const run = jest.fn(async (_command, args) => ({
    stdout: args[0] === "branch" ? "main\n" : args[0] === "rev-parse" ? `${commit}\n` : "",
  }));
  const manager = createDeploymentManager({
    repositoryPath: "/router/core",
    run,
  });
  manager.start("missing-installed-package");
  for (let attempt = 0; attempt < 1000 && manager.getStatus().status !== "succeeded"; attempt += 1)
    await new Promise((resolve) => setImmediate(resolve));
  expect(manager.getStatus().status).toBe("succeeded");
});

test("uses distinct configured Snowflake identities for active instances", async () => {
  const first = createManager({
    repositoryPath: "/router/core1",
    snowflake: { workerId: 1, processId: 2 },
  });
  const second = createManager({
    repositoryPath: "/router/core2",
    snowflake: { workerId: 2, processId: 1 },
  });

  const firstStart = first.start("delivery-one");
  const secondStart = second.start("delivery-two");
  expect(firstStart.runId).not.toBe(secondStart.runId);
  await waitFor(first, "succeeded");
  await waitFor(second, "succeeded");
});

test("rejects concurrent deployments for one repository and records notification failures", async () => {
  let finishStatus;
  let firstStatus = true;
  let lockActive = false;
  const acquireLock = jest.fn(() => {
    if (lockActive) throw new Error("Another deployment process is active.");
    lockActive = true;
    return () => {
      lockActive = false;
    };
  });
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
  const manager = createManager({ repositoryPath: "/router/core1", run, notify, acquireLock });
  manager.start("delivery-7");
  expect(manager.start("delivery-8")).toEqual({ accepted: false, status: "busy" });
  expect(
    createManager({ repositoryPath: "/router/core1", acquireLock }).start("delivery-9"),
  ).toEqual({
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

test("reports execution setup failures through the manager", async () => {
  const manager = createManager({
    repositoryPath: "/router/core",
    now: () => {
      throw new Error("clock unavailable");
    },
  });
  manager.start("setup-failure");
  await waitFor(manager, "failed");
  expect(manager.getStatus()).toMatchObject({
    failedStep: "deployment setup",
    error: "clock unavailable",
  });
});
