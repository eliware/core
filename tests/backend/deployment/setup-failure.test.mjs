import { expect, jest, test } from "@jest/globals";
import createDeploymentStatus from "../../../src/backend/deployment/status.mjs";
import reportSetupFailure from "../../../src/backend/deployment/setup-failure.mjs";

jest.unstable_mockModule("node:child_process", () => ({ execFile: jest.fn() }));
const createDeploymentManager = (await import("../../../src/backend/deployment.mjs")).default;

async function waitFor(manager, status) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (manager.getStatus().status === status) return manager.getStatus();
    await Promise.resolve();
  }
  throw new Error(`Deployment did not reach ${status}.`);
}

function setup({
  error = new Error("setup failed"),
  notify = jest.fn(),
  now = () => new Date("2026-11-18T12:01:00.000Z"),
} = {}) {
  const status = createDeploymentStatus({
    event: "push",
    startedAt: "2026-11-18T12:00:00.000Z",
    steps: [],
  });
  return { error, event: "push", notify, now, status, runId: "123456" };
}

test("records setup failure and sends a notification", async () => {
  const state = setup({ now: () => new Date("2026-11-18T12:01:00.000Z") });

  await reportSetupFailure(state);

  expect(state.status.get()).toEqual({
    runId: "123456",
    event: "push",
    status: "failed",
    error: "setup failed",
    startedAt: "2026-11-18T12:00:00.000Z",
    finishedAt: "2026-11-18T12:01:00.000Z",
    steps: [],
  });
  expect(state.notify).toHaveBeenCalledWith(
    "Core deployment 123456 failed at deployment setup. setup failed",
  );
});

test("limits error text and records notification failures", async () => {
  const state = setup({
    error: "x".repeat(400),
    notify: jest.fn().mockRejectedValue(new Error("offline")),
    now: () => {
      throw new Error("clock unavailable");
    },
  });

  await reportSetupFailure(state);

  expect(state.status.get().error).toBe("x".repeat(300));
  expect(state.status.get().finishedAt).toBe(state.status.get().startedAt);
  expect(state.status.get().notificationError).toBe("Discord notification failed.");
});

test("formats non-error setup failures", async () => {
  const state = setup({ error: null, now: () => new Date("2026-11-18T12:02:00.000Z") });

  await reportSetupFailure(state);

  expect(state.status.get().error).toBe("null");
});

test("reports a lock release failure after deployment completion", async () => {
  const manager = createDeploymentManager({
    repositoryPath: "/router/config",
    acquireLock: () => () => {
      throw "lock release failed";
    },
    notify: jest.fn().mockRejectedValue(new Error("Discord unavailable")),
    now: () => new Date("2026-11-18T12:00:00.000Z"),
    run: async (command, args) => {
      if (command === "git" && args[0] === "branch") return { stdout: "main\n" };
      return command === "git" && args[0] === "rev-parse"
        ? { stdout: `${"a".repeat(40)}\n` }
        : { stdout: "" };
    },
  });

  manager.start("push");
  for (let attempt = 0; attempt < 100 && manager.getStatus().status !== "succeeded"; attempt += 1)
    await Promise.resolve();
  for (let attempt = 0; attempt < 20 && !manager.getStatus().notificationError; attempt += 1)
    await Promise.resolve();

  expect(manager.getStatus().status).toBe("succeeded");
  expect(manager.getStatus().lockReleaseError).toBe("Deployment lock cleanup failed.");
  expect(manager.getStatus().notificationError).toBe("Discord notification failed.");
});

test("reports unexpected deployment setup failures", async () => {
  const manager = createDeploymentManager({
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
  for (const currentBranch of ["release", undefined]) {
    const run = jest.fn(async (_command, args) =>
      args[0] === "branch" ? { stdout: currentBranch } : { stdout: "" },
    );
    const manager = createDeploymentManager({ repositoryPath: "/router/config", run });

    manager.start("push");
    expect((await waitFor(manager, "failed")).error).toContain("must be on branch main");
    expect(run).toHaveBeenCalledTimes(2);
  }
});

test("rejects dirty repositories and invalid base revisions", async () => {
  const dirtyRun = jest.fn().mockResolvedValue({ stdout: " M config.json\n" });
  const dirty = createDeploymentManager({ repositoryPath: "/router/config", run: dirtyRun });
  dirty.start("dirty-push");
  expect((await waitFor(dirty, "failed")).error).toContain("uncommitted changes");
  expect(dirtyRun).toHaveBeenCalledTimes(1);

  const revisionRun = jest.fn(async (_command, args) => {
    if (args[0] === "branch") return { stdout: "main\n" };
    if (args[0] === "status") return { stdout: null };
    if (args[0] === "rev-parse") return { stdout: undefined };
    return { stdout: "" };
  });
  const revision = createDeploymentManager({
    repositoryPath: "/router/config",
    run: revisionRun,
    notify: jest.fn().mockRejectedValue(new Error("Discord unavailable")),
  });
  revision.start("bad-revision");
  expect((await waitFor(revision, "failed")).error).toContain("invalid commit ID");
  await Promise.resolve();
  expect(revision.getStatus().notificationError).toBe("Discord notification failed.");
});
