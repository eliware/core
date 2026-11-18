import { expect, jest, test } from "@jest/globals";
import recoverDeployment from "../../../src/backend/deployment/recovery.mjs";

test("restores the prior commit without reloading when reload has not started", async () => {
  const steps = [];
  const run = jest.fn().mockResolvedValue({});
  await expect(
    recoverDeployment({ run, repositoryPath: "/router", previousCommit: "abc", steps }),
  ).resolves.toBeUndefined();
  expect(run).toHaveBeenCalledWith("git", ["reset", "--hard", "abc"], { cwd: "/router" });
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
      run: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("reload denied")),
      repositoryPath: "/router",
      previousCommit: "abc",
      reloadStarted: true,
      steps: reloadSteps,
    }),
  ).resolves.toBe("Previous commit restored, but its reload failed.");
  expect(reloadSteps.at(-1)).toMatchObject({ status: "failed", detail: "reload denied" });
});
