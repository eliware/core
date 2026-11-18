import { expect, jest, test } from "@jest/globals";
import createDeploymentAdmission from "../../../src/backend/deployment/admission.mjs";

function setup(overrides = {}) {
  const execute = jest.fn(async (_event, _runId, release) => release());
  const reportSetupFailure = jest.fn();
  const acquireLock = jest.fn(() => jest.fn());
  const admit = createDeploymentAdmission({
    repositoryPath: "/router/config",
    generateRunId: () => "run-1",
    acquireLock,
    reportSetupFailure,
    ...overrides,
  });
  return { admit, execute, acquireLock, reportSetupFailure };
}

test("admits work, acquires its lock, and runs its lifecycle", () => {
  const state = setup();

  expect(state.admit("push", state.execute)).toEqual({ accepted: true, runId: "run-1" });
  expect(state.acquireLock).toHaveBeenCalledWith("/router/config");
  expect(state.execute).toHaveBeenCalledWith("push", "run-1", expect.any(Function));
});

test.each([
  [{ repositoryPath: undefined }, "unconfigured"],
  [
    {
      generateRunId: () => {
        throw new Error("id failed");
      },
    },
    "unavailable",
  ],
  [
    {
      acquireLock: () => {
        throw new Error("deployment process is active");
      },
    },
    "busy",
  ],
  [
    {
      acquireLock: () => {
        throw new Error("lock failed");
      },
    },
    "unavailable",
  ],
  [
    {
      acquireLock: () => {
        throw null;
      },
    },
    "unavailable",
  ],
])("rejects admission with the expected status %s", (overrides, status) => {
  const state = setup(overrides);

  expect(state.admit("push", state.execute)).toEqual({ accepted: false, status });
  expect(state.execute).not.toHaveBeenCalled();
});

test("rejects concurrent work while an admitted operation runs", async () => {
  let finish;
  const state = setup({
    acquireLock: jest.fn(() => jest.fn()),
  });
  state.execute.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );

  expect(state.admit("push", state.execute)).toEqual({ accepted: true, runId: "run-1" });
  expect(state.admit("push", state.execute)).toEqual({ accepted: false, status: "busy" });
  finish();
  await Promise.resolve();
});

test("supports a lock adapter without a release callback", () => {
  const state = setup({ acquireLock: () => undefined });
  const release = jest.fn();
  state.execute.mockImplementationOnce(async (_event, _runId, releaseLock) => {
    releaseLock();
    release();
  });

  expect(state.admit("push", state.execute)).toEqual({ accepted: true, runId: "run-1" });
  expect(release).toHaveBeenCalledTimes(1);
});

test("reports asynchronous setup failures", async () => {
  const state = setup();
  state.execute.mockRejectedValueOnce(new Error("setup failed"));

  state.admit("push", state.execute);
  await Promise.resolve();

  expect(state.reportSetupFailure).toHaveBeenCalledWith(new Error("setup failed"), "push", "run-1");
});
