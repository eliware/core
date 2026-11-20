import { expect, jest, test } from "@jest/globals";
import createDeploymentStatus from "../../../src/backend/deployment/status.mjs";
import notifyDeployment from "../../../src/backend/deployment/notify.mjs";

function createStatus() {
  const status = createDeploymentStatus({ status: "succeeded", steps: [] });
  return { status, notify: jest.fn().mockResolvedValue(undefined) };
}

test("sends a rich deployment notification", async () => {
  const state = createStatus();

  await notifyDeployment({ ...state, branch: "main", githubPayload: {} });

  expect(state.notify).toHaveBeenCalledWith(
    expect.objectContaining({ title: "✅ Core deployment succeeded", color: 0x00ff00 }),
  );
});

test("records notification failures without throwing", async () => {
  const state = createStatus();
  state.notify.mockRejectedValue(new Error("offline"));

  await expect(notifyDeployment({ ...state, branch: "main", githubPayload: {} })).resolves.toBe(
    undefined,
  );
  expect(state.status.get().notificationError).toBe("Discord notification failed.");
});

test("does not throw when status storage rejects a notification failure update", async () => {
  const status = {
    get: () => ({ status: "failed", steps: [] }),
    update: jest.fn(() => {
      throw new Error("status storage unavailable");
    }),
  };
  const notify = jest.fn().mockRejectedValue(new Error("Discord is unavailable"));

  await expect(
    notifyDeployment({ status, notify, branch: "main", githubPayload: {} }),
  ).resolves.toBeUndefined();
  expect(status.update).toHaveBeenCalledWith({ notificationError: "Discord notification failed." });
});
