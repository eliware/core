import { expect, jest, test } from "@jest/globals";
import createDeploymentStatus from "../../../../src/backend/deployment/status.mjs";
import restartCoreAfterUpdate from "../../../../src/backend/deployment/core/restart.mjs";

test("schedules restart when npm ci changes the installed Core version", async () => {
  const status = createDeploymentStatus({ runId: "123", status: "running", steps: [] });
  const scheduleRestart = jest.fn().mockResolvedValue(undefined);
  await expect(
    restartCoreAfterUpdate({
      previousVersion: "15.2.2",
      readVersion: jest.fn().mockResolvedValue("15.2.3"),
      scheduleRestart,
      runId: "123",
      repositoryPath: "/router/core",
      previousCommit: "a".repeat(40),
      catalogActions: [],
      status,
      serviceUnit: "core.service",
      port: 9400,
    }),
  ).resolves.toBe(true);
  expect(scheduleRestart).toHaveBeenCalledWith(
    expect.objectContaining({
      repositoryPath: "/router/core",
      serviceUnit: "core.service",
      port: 9400,
      status: expect.objectContaining({
        currentStep: "restart Core service",
        steps: [expect.objectContaining({ name: "restart Core service", status: "running" })],
      }),
    }),
  );
});

test("skips restart when the installed Core version stays the same", async () => {
  const scheduleRestart = jest.fn();
  await expect(
    restartCoreAfterUpdate({
      previousVersion: "15.2.3",
      readVersion: jest.fn().mockResolvedValue("15.2.3"),
      scheduleRestart,
      status: createDeploymentStatus(),
    }),
  ).resolves.toBe(false);
  expect(scheduleRestart).not.toHaveBeenCalled();
});
