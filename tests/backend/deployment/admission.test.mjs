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
  expect(state.execute).toHaveBeenCalledWith("push", "run-1", expect.any(Function), undefined);
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

test("ignores repeated release calls after lock cleanup succeeds", () => {
  const releaseLock = jest.fn();
  const state = setup({ acquireLock: () => releaseLock });
  state.execute.mockImplementationOnce(async (_event, _runId, release) => {
    release();
    release();
  });

  state.admit("push", state.execute);

  expect(releaseLock).toHaveBeenCalledTimes(1);
});

test("reports asynchronous setup failures", async () => {
  const state = setup();
  state.execute.mockRejectedValueOnce(new Error("setup failed"));

  state.admit("push", state.execute);
  await Promise.resolve();

  expect(state.reportSetupFailure).toHaveBeenCalledWith(
    new Error("setup failed"),
    "push",
    "run-1",
    undefined,
  );
  expect(state.acquireLock.mock.results[0].value).toHaveBeenCalledTimes(1);
});

test("keeps admission busy when setup failure lock cleanup fails", async () => {
  const release = jest.fn(() => {
    throw new Error("lock cleanup failed");
  });
  const state = setup({ acquireLock: () => release });
  const failure = new Error("execution failed");
  state.execute.mockRejectedValueOnce(failure);

  state.admit("push", state.execute);
  await Promise.resolve();

  expect(release).toHaveBeenCalledTimes(1);
  expect(state.reportSetupFailure).toHaveBeenCalledWith(failure, "push", "run-1", undefined);
  expect(state.admit("next", state.execute)).toEqual({ accepted: false, status: "busy" });
  expect(release).toHaveBeenCalledTimes(2);
});

test("retries a pending lock release before admitting more work", async () => {
  const release = jest.fn().mockImplementationOnce(() => {
    throw new Error("temporary lock cleanup failure");
  });
  const state = setup({ acquireLock: () => release });
  state.execute.mockRejectedValueOnce(new Error("execution failed"));

  state.admit("push", state.execute);
  await Promise.resolve();

  expect(state.admit("next", state.execute)).toEqual({ accepted: true, runId: "run-1" });
  expect(release).toHaveBeenCalledTimes(3);
});

test("contains a rejection from setup failure reporting", async () => {
  const state = setup();
  state.execute.mockRejectedValueOnce(new Error("execution failed"));
  state.reportSetupFailure.mockRejectedValueOnce(new Error("reporting failed"));

  state.admit("push", state.execute);
  await Promise.resolve();
  await Promise.resolve();

  expect(state.reportSetupFailure).toHaveBeenCalledTimes(1);
  expect(state.admit("next push", state.execute)).toEqual({ accepted: true, runId: "run-1" });
});
