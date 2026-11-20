import { expect, jest, test } from "@jest/globals";
import recoverDeployment from "../../../src/backend/deployment/recovery-unit.mjs";

test("restores the prior commit without reloading when reload has not started", async () => {
  const steps = [];
  const run = jest.fn().mockResolvedValue({});
  await expect(
    recoverDeployment({ run, repositoryPath: "/router", previousCommit: "abc", steps }),
  ).resolves.toBeUndefined();
  expect(run).toHaveBeenCalledWith("git", ["reset", "--hard", "abc"], { cwd: "/router" });
  expect(run).not.toHaveBeenCalledWith("git", ["clean", "-fd"], { cwd: "/router" });
  expect(steps).toEqual([{ name: "restore previous commit", status: "passed" }]);
});

test("reloads restored configuration after an unsuccessful deployment reload", async () => {
  const steps = [];
  const run = jest.fn().mockResolvedValue({});
  await expect(
    recoverDeployment({
      run,
      repositoryPath: "/router",
      previousCommit: "abc",
      reloadStarted: true,
      steps,
    }),
  ).resolves.toBeUndefined();
  expect(steps.at(-1)).toEqual({ name: "reload previous configuration", status: "passed" });
});

test("reapplies catalog actions after restoring the prior commit", async () => {
  const steps = [];
  const run = jest.fn().mockResolvedValue({});
  await expect(
    recoverDeployment({
      run,
      repositoryPath: "/router",
      previousCommit: "abc",
      reloadStarted: true,
      catalogActions: [{ operation: "restart", unit: "frr.service" }],
      steps,
    }),
  ).resolves.toBeUndefined();
  expect(run).toHaveBeenCalledWith(
    "systemctl",
    ["restart", "frr.service"],
    expect.objectContaining({ cwd: "/router" }),
  );
  expect(steps.at(-1)).toEqual({ name: "restore restart frr.service", status: "passed" });
});

test("reports reset and restored reload failures", async () => {
  const resetSteps = [];
  await expect(
    recoverDeployment({
      run: jest.fn().mockRejectedValue(new Error("reset denied")),
      repositoryPath: "/router",
      previousCommit: "abc",
      steps: resetSteps,
    }),
  ).resolves.toContain("restore failed: reset denied");
  expect(resetSteps).toEqual([{ name: "restore previous commit", status: "failed" }]);

  const reloadSteps = [];
  await expect(
    recoverDeployment({
      run: jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("reload denied")),
      repositoryPath: "/router",
      previousCommit: "abc",
      reloadStarted: true,
      steps: reloadSteps,
    }),
  ).resolves.toBe("Previous commit restored, but its reload failed.");
  expect(reloadSteps.at(-1)).toMatchObject({ status: "failed", detail: "reload denied" });
});

test("does not reload when commit restoration fails after a deployment reload", async () => {
  const run = jest.fn().mockRejectedValue(new Error("reset denied"));
  const steps = [];
  await expect(
    recoverDeployment({
      run,
      repositoryPath: "/router",
      previousCommit: "abc",
      reloadStarted: true,
      steps,
    }),
  ).resolves.toContain("Previous commit restore failed: reset denied");
  expect(run).toHaveBeenCalledTimes(1);
  expect(steps).toEqual([{ name: "restore previous commit", status: "failed" }]);
});

test("preserves untracked files while restoring the prior commit", async () => {
  const run = jest.fn().mockResolvedValue({});
  await recoverDeployment({ run, repositoryPath: "/router", previousCommit: "abc", steps: [] });
  expect(run.mock.calls.map(([, args]) => args)).toEqual([["reset", "--hard", "abc"]]);
});

test("reports when replaying catalog actions fails during recovery", async () => {
  const steps = [];
  const run = jest.fn(async (command) => {
    if (command === "systemctl") throw new Error("systemd unavailable");
    return {};
  });
  await expect(
    recoverDeployment({
      run,
      repositoryPath: "/router",
      previousCommit: "abc",
      reloadStarted: true,
      catalogActions: [{ operation: "reload", unit: "named.service" }],
      steps,
    }),
  ).resolves.toContain("its reload failed");
  expect(steps.at(-1)).toMatchObject({
    name: "restore catalog actions",
    status: "failed",
    detail: "restore reload named.service failed.",
  });
});
