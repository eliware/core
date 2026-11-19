import { expect, jest, test } from "@jest/globals";
import verifyDeploymentWorktree from "../../../src/backend/deployment/worktree.mjs";

jest.unstable_mockModule("node:child_process", () => ({ execFile: jest.fn() }));
const createDeploymentManager = (await import("../../../src/backend/deployment.mjs")).default;
const commit = "a".repeat(40);

test("records a clean worktree check", async () => {
  const steps = [];
  const run = jest.fn().mockResolvedValue({ stdout: "" });
  const onStart = jest.fn();

  await verifyDeploymentWorktree({
    afterStep: "npm test",
    repositoryPath: "/router/config",
    run,
    steps,
    onStart,
  });

  expect(steps).toEqual([{ name: "git status after npm test", status: "passed" }]);
  expect(onStart).toHaveBeenCalledWith("git status after npm test", steps);
});

test.each([
  [{ stdout: " M package.json\n" }, "Configuration repository has uncommitted changes."],
  [new Error("status failed"), "status failed"],
])("rejects an invalid worktree check", async (result, message) => {
  const steps = [];
  const run = jest.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });

  await expect(
    verifyDeploymentWorktree({
      afterStep: "npm ci",
      repositoryPath: "/router/config",
      run,
      steps,
      onStart: jest.fn(),
    }),
  ).rejects.toMatchObject({
    message: "git status after npm ci failed.",
    cause: expect.objectContaining({ message }),
    stepName: "git status after npm ci",
  });
  expect(steps[0]).toMatchObject({ name: "git status after npm ci", status: "failed" });
});

test("treats a status result without output as clean", async () => {
  const steps = [];

  await verifyDeploymentWorktree({
    afterStep: "npm test",
    repositoryPath: "/router/config",
    run: jest.fn().mockResolvedValue({}),
    steps,
    onStart: jest.fn(),
  });

  expect(steps[0].status).toBe("passed");
});

test("records status commands that reject without an error object", async () => {
  const steps = [];

  await expect(
    verifyDeploymentWorktree({
      afterStep: "npm test",
      repositoryPath: "/router/config",
      run: jest.fn().mockRejectedValue(null),
      steps,
      onStart: jest.fn(),
    }),
  ).rejects.toMatchObject({ cause: null, stepName: "git status after npm test" });
  expect(steps[0].detail).toBe("null");
});

test("stops after dependency scripts change the worktree and restores the prior commit", async () => {
  let statusChecks = 0;
  const run = jest.fn(async (command, args) => {
    if (command === "git" && args[0] === "branch") return { stdout: "main\n" };
    if (command === "git" && args[0] === "rev-parse") return { stdout: `${commit}\n` };
    if (command === "git" && args[0] === "status") {
      statusChecks += 1;
      return { stdout: statusChecks === 3 ? " M package.json\n" : "" };
    }
    return { stdout: "" };
  });
  const manager = createDeploymentManager({
    repositoryPath: "/router/config",
    now: () => new Date("2026-11-18T12:00:00.000Z"),
    acquireLock: () => () => {},
    run,
  });

  manager.start("dependency-script-change");
  for (let attempt = 0; attempt < 100 && manager.getStatus().status !== "failed"; attempt += 1)
    await Promise.resolve();

  expect(manager.getStatus().failedStep).toBe("git status after npm ci --include=dev");
  expect(run).not.toHaveBeenCalledWith("npm", ["test"], expect.any(Object));
  expect(run).not.toHaveBeenCalledWith("npm", ["run", "reload"], expect.any(Object));
  expect(run).toHaveBeenCalledWith("git", ["reset", "--hard", commit], expect.any(Object));
});
