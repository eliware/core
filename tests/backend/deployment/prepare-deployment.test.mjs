import { expect, jest, test } from "@jest/globals";
import catalog from "../../../test-fixtures/deployment-catalog.mjs";
import prepareDeployment from "../../../src/backend/deployment/prepare-deployment.mjs";

test("validates the update before applying configuration", async () => {
  const steps = [];
  const state = { reloadStarted: false };
  const run = jest.fn(async (_command, args) => ({
    stdout: args[0] === "branch" ? "main\n" : args[0] === "rev-parse" ? `${"a".repeat(40)}\n` : "",
  }));
  const runStep = jest.fn(async (name) => steps.push({ name, status: "passed" }));
  const verifyCleanWorktree = jest.fn();
  await prepareDeployment({
    repositoryPath: "/router/core",
    branch: "main",
    run,
    readVersion: jest.fn().mockResolvedValue("15.2.3"),
    loadCatalog: () => null,
    runStep,
    verifyCleanWorktree,
    steps,
    state,
    onStart: jest.fn(),
  });
  expect(runStep.mock.calls.map(([name]) => name)).toEqual([
    "git pull",
    "npm ci --include=dev",
    "npm test",
    "npm run preflight",
    "npm run reload",
  ]);
  expect(state).toMatchObject({
    previousCommit: "a".repeat(40),
    previousCoreVersion: "15.2.3",
    reloadStarted: true,
  });
  expect(verifyCleanWorktree).toHaveBeenCalledTimes(4);
});

test("records planned catalog actions for the restart worker", async () => {
  const steps = [];
  const state = { reloadStarted: false };
  const run = jest.fn(async (_command, args) => ({
    stdout:
      args[0] === "branch"
        ? "main\n"
        : args[0] === "rev-parse"
          ? `${"a".repeat(40)}\n`
          : args[0] === "diff"
            ? "etc/named.conf\0"
            : "",
  }));
  await prepareDeployment({
    repositoryPath: "/router/core",
    branch: "main",
    run,
    readVersion: jest.fn().mockResolvedValue("15.2.3"),
    loadCatalog: () => catalog,
    runStep: jest.fn(async (name) => steps.push({ name, status: "passed" })),
    verifyCleanWorktree: jest.fn(),
    steps,
    state,
    onStart: jest.fn(),
  });
  expect(state.catalogActions).toEqual([{ operation: "reload", unit: "named.service" }]);
});
