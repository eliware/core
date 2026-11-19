import { expect, jest, test } from "@jest/globals";
import createDeploymentStatus from "../../../src/backend/deployment/status.mjs";
import reportSetupFailure from "../../../src/backend/deployment/setup-failure.mjs";

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
