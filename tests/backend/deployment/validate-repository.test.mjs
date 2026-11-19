import { expect, jest, test } from "@jest/globals";
import validateDeploymentRepository from "../../../src/backend/deployment/validate-repository.mjs";

const commit = "a".repeat(40);

function createRun(overrides = {}) {
  return jest.fn(async (_command, args) => {
    if (args[0] === "branch") return { stdout: "main\n" };
    if (args[0] === "rev-parse") return { stdout: `${commit}\n` };
    return { stdout: "", ...overrides.status };
  });
}

test("validates the clean repository, branch, and recovery commit", async () => {
  const run = createRun();
  await expect(
    validateDeploymentRepository({ run, repositoryPath: "/router", branch: "main" }),
  ).resolves.toBe(commit);
  expect(run).toHaveBeenCalledTimes(3);
});

test.each([
  [{ status: 1 }, "Git status exited"],
  [{ dirty: " M file" }, "uncommitted changes"],
  [{ branchCode: 1 }, "git branch exited"],
  [{ branch: "other" }, "must be on branch"],
  [{ revisionCode: 1 }, "invalid commit ID"],
  [{ revision: "bad" }, "invalid commit ID"],
])("rejects an invalid repository state %s", async (failure, message) => {
  const run = jest.fn(async (_command, args) => {
    if (args[0] === "status")
      return { stdout: failure.dirty ?? "", ...(failure.status ? { code: failure.status } : {}) };
    if (args[0] === "branch")
      return {
        stdout: `${failure.branch ?? "main"}\n`,
        ...(failure.branchCode ? { code: failure.branchCode } : {}),
      };
    return {
      stdout: `${failure.revision ?? commit}\n`,
      ...(failure.revisionCode ? { code: failure.revisionCode } : {}),
    };
  });
  await expect(
    validateDeploymentRepository({ run, repositoryPath: "/router", branch: "main" }),
  ).rejects.toThrow(message);
});
