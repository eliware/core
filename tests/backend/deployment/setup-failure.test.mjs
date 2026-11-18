import { expect, jest, test } from "@jest/globals";
import createDeploymentStatus from "../../../src/backend/deployment/status.mjs";
import reportSetupFailure from "../../../src/backend/deployment/setup-failure.mjs";

jest.unstable_mockModule("node:child_process", () => ({ execFile: jest.fn() }));
const createDeploymentManager = (await import("../../../src/backend/deployment.mjs")).default;

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
    run: async (command, args) =>
      command === "git" && args[0] === "rev-parse"
        ? { stdout: `${"a".repeat(40)}\n` }
        : { stdout: "" },
  });

  manager.start("push");
  for (let attempt = 0; attempt < 100 && manager.getStatus().status !== "failed"; attempt += 1)
    await Promise.resolve();
  for (let attempt = 0; attempt < 20 && !manager.getStatus().notificationError; attempt += 1)
    await Promise.resolve();

  expect(manager.getStatus().error).toBe("lock release failed");
  expect(manager.getStatus().notificationError).toBe("Discord notification failed.");
});
