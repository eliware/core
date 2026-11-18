import { expect, jest, test } from "@jest/globals";
import runDeploymentStep from "../../../src/backend/deployment/step.mjs";

test("records a successful step and notifies the workflow", async () => {
  const steps = [];
  const run = jest.fn().mockResolvedValue({});
  const onStart = jest.fn();
  await runDeploymentStep({
    name: "npm test",
    command: "npm",
    args: ["test"],
    repositoryPath: "/router",
    run,
    steps,
    onStart,
  });
  expect(onStart).toHaveBeenCalledWith("npm test", steps);
  expect(run).toHaveBeenCalledWith(
    "npm",
    ["test"],
    expect.objectContaining({ cwd: "/router", timeout: 900000, maxBuffer: 1048576 }),
  );
  expect(steps).toEqual([{ name: "npm test", status: "passed" }]);
});

test("records command failures and preserves the failed step name", async () => {
  const steps = [];
  await expect(
    runDeploymentStep({
      name: "npm ci",
      command: "npm",
      args: ["ci"],
      repositoryPath: "/router",
      run: jest.fn().mockRejectedValue(null),
      steps,
      onStart: jest.fn(),
    }),
  ).rejects.toMatchObject({ message: "npm ci failed.", stepName: "npm ci" });
  expect(steps).toEqual([{ name: "npm ci", status: "failed", detail: "null" }]);
});
