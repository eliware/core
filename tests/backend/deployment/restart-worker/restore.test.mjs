import { expect, jest, test } from "@jest/globals";
import restore from "../../../../src/backend/deployment/restart-worker/restore.mjs";

function payload(overrides = {}) {
  return {
    previousCommit: "a".repeat(40),
    repositoryPath: "/router/core",
    catalogActions: [{ operation: "reload", unit: "named.service" }],
    serviceUnit: "core.service",
    port: 9300,
    ...overrides,
  };
}

test("restores the previous commit and catalog configuration", async () => {
  const run = jest.fn().mockResolvedValue({ stdout: "" });
  const checkReady = jest.fn().mockResolvedValue(undefined);
  const steps = [];
  await expect(restore(payload(), steps, { run, checkReady })).resolves.toContain(
    "Previous commit and dependencies were restored",
  );
  expect(run.mock.calls.map(([command, args]) => [command, args])).toEqual([
    ["git", ["reset", "--hard", "a".repeat(40)]],
    ["npm", ["ci", "--include=dev"]],
    ["systemctl", ["reload", "named.service"]],
    ["systemctl", ["restart", "core.service"]],
  ]);
  expect(checkReady).toHaveBeenCalledWith(9300, "core.service", run);
  expect(steps.map(({ name, status }) => [name, status])).toEqual([
    ["restore previous commit", "passed"],
    ["restore previous dependencies", "passed"],
    ["restore reload named.service", "passed"],
    ["restart Core with previous version", "passed"],
    ["check Core health after rollback", "passed"],
  ]);
});

test("reloads all configuration when no catalog actions exist", async () => {
  const run = jest.fn().mockResolvedValue({ stdout: "" });
  const steps = [];
  await restore(payload({ catalogActions: undefined }), steps, {
    run,
    checkReady: jest.fn().mockResolvedValue(undefined),
  });
  expect(run).toHaveBeenCalledWith("npm", ["run", "reload"], {
    cwd: "/router/core",
    timeout: 15 * 60_000,
    maxBuffer: 1024 * 1024,
  });
  expect(steps).toContainEqual({ name: "reload previous configuration", status: "passed" });
});

test("does not run the legacy reload when a catalog has no changed actions", async () => {
  const run = jest.fn().mockResolvedValue({ stdout: "" });
  const steps = [];
  await restore(payload({ catalogActions: [] }), steps, {
    run,
    checkReady: jest.fn().mockResolvedValue(undefined),
  });
  expect(run).not.toHaveBeenCalledWith("npm", ["run", "reload"], expect.anything());
  expect(run).toHaveBeenCalledWith("systemctl", ["restart", "core.service"]);
});

test("reports recovery failures and records the failed step", async () => {
  const steps = [];
  await expect(
    restore(payload(), steps, {
      run: jest.fn().mockRejectedValue(new Error("reset failed")),
      checkReady: jest.fn(),
    }),
  ).resolves.toBe("Recovery failed: reset failed");
  expect(steps).toContainEqual({
    name: "restore Core after failed restart",
    status: "failed",
    detail: "reset failed",
  });
});
