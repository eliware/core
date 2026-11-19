import { expect, jest, test } from "@jest/globals";
import createDeploymentOperations from "../../../src/backend/deployment/operations.mjs";

test("records step and worktree checks in deployment status", async () => {
  const steps = [];
  const status = { update: jest.fn() };
  const run = jest.fn().mockResolvedValue({ stdout: "" });
  const operations = createDeploymentOperations({ repositoryPath: "/repo", run, steps, status });
  await operations.step("npm test", "npm", ["test"]);
  await operations.verifyCleanWorktree("npm test");
  expect(steps).toEqual([
    { name: "npm test", status: "passed" },
    { name: "git status after npm test", status: "passed", internal: true },
  ]);
  expect(status.update).toHaveBeenCalledWith({ currentStep: "npm test", steps: [] });
  expect(run).toHaveBeenCalledWith("git", ["status", "--porcelain"], { cwd: "/repo" });
});
