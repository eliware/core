import { expect, jest, test } from "@jest/globals";
import executeDeployment from "../../../src/backend/deployment/execute.mjs";

const commit = "a".repeat(40);

function setup(overrides = {}) {
  const current = {};
  const status = {
    get: () => current,
    set: (value) => Object.assign(current, value),
    update: (value) => Object.assign(current, value),
  };
  const run = jest.fn(async (command, args) => {
    if (command === "git" && args[0] === "branch") return { stdout: "main\n" };
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    return { stdout: "" };
  });
  const dependencies = {
    event: "delivery",
    runId: "run-1",
    releaseLock: jest.fn(),
    githubPayload: {},
    repositoryPath: "/router/core",
    branch: "main",
    run,
    recover: jest.fn().mockResolvedValue("Previous configuration restored."),
    now: () => new Date("2026-11-19T12:00:00.000Z"),
    readVersion: jest.fn().mockResolvedValue(null),
    loadCatalog: () => null,
    scheduleRestart: jest.fn().mockResolvedValue(undefined),
    serviceUnit: "core.service",
    dashboardPort: 9300,
    status,
    notify: jest.fn(),
    ...overrides,
  };
  return { current, dependencies, run };
}

test("completes deployment, releases its lock, and notifies", async () => {
  const state = setup();
  await executeDeployment(state.dependencies);
  expect(state.current).toMatchObject({ status: "succeeded", runId: "run-1" });
  expect(state.dependencies.releaseLock).toHaveBeenCalledTimes(2);
  expect(state.dependencies.notify).toHaveBeenCalledTimes(1);
  expect(state.run.mock.calls.map(([, args]) => args[1])).toContain("reload");
});

test("delegates changed Core versions to the restart scheduler", async () => {
  const state = setup({
    readVersion: jest.fn().mockResolvedValueOnce("15.2.0").mockResolvedValueOnce("15.2.1"),
  });
  await executeDeployment(state.dependencies);
  expect(state.dependencies.scheduleRestart).toHaveBeenCalled();
  expect(state.dependencies.releaseLock).toHaveBeenCalledTimes(2);
  expect(state.current.status).toBe("running");
});

test("recovers after a failed reload and reports recovery errors", async () => {
  const state = setup({
    run: jest.fn(async (command, args) => {
      if (command === "git" && args[0] === "branch") return { stdout: "main\n" };
      if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
      if (command === "npm" && args[0] === "run" && args[1] === "reload")
        throw new Error("reload failed");
      return { stdout: "" };
    }),
    recover: jest.fn().mockRejectedValue("restore unavailable"),
  });
  await executeDeployment(state.dependencies);
  expect(state.dependencies.recover).toHaveBeenCalledWith(
    expect.objectContaining({ previousCommit: commit, reloadStarted: true }),
  );
  expect(state.current).toMatchObject({
    status: "failed",
    recovery: "Recovery failed: restore unavailable",
  });
  expect(state.dependencies.releaseLock).toHaveBeenCalledTimes(2);
});

test("passes catalog actions to recovery after a service reload fails", async () => {
  const catalog = {
    components: [
      {
        configPaths: ["etc/named.conf"],
        action: { operation: "reload", unit: "named.service" },
      },
    ],
  };
  const run = jest.fn(async (command, args) => {
    if (command === "git" && args[0] === "branch") return { stdout: "main\n" };
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "git" && args[0] === "diff") return { stdout: "M\0etc/named.conf\0" };
    if (command === "systemctl" && args[0] === "reload") throw new Error("reload failed");
    return { stdout: "" };
  });
  const state = setup({ run, loadCatalog: () => catalog });
  await executeDeployment(state.dependencies);
  expect(state.dependencies.recover).toHaveBeenCalledWith(
    expect.objectContaining({ catalogActions: [catalog.components[0].action] }),
  );
});

test("records setup failures without attempting recovery", async () => {
  const state = setup({
    run: jest.fn().mockRejectedValue(new Error("Git is unavailable")),
  });
  await executeDeployment(state.dependencies);
  expect(state.dependencies.recover).not.toHaveBeenCalled();
  expect(state.current).toMatchObject({ status: "failed", error: "Git is unavailable" });
});

test("records notification and lock cleanup failures", async () => {
  const state = setup({
    releaseLock: () => {
      throw new Error("lock is busy");
    },
    notify: jest.fn().mockRejectedValue(new Error("Discord is unavailable")),
  });
  await executeDeployment(state.dependencies);
  expect(state.current).toMatchObject({
    status: "succeeded",
    lockReleaseError: "Deployment lock cleanup failed.",
    notificationError: "Discord notification failed.",
  });
});
