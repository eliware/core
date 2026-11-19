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
