import { expect, test } from "@jest/globals";
import createFailureStatus from "../../../src/backend/deployment/failure-status.mjs";

const fixedNow = () => new Date("2026-11-18T12:01:00.000Z");

test("maps a command failure into a terminal status record", () => {
  expect(
    createFailureStatus({
      error: Object.assign(new Error("test failed"), { stepName: "npm test" }),
      event: "push",
      runId: "123456",
      recovery: undefined,
      startedAt: "2026-11-18T12:00:00.000Z",
      steps: [],
      now: fixedNow,
    }),
  ).toEqual({
    runId: "123456",
    event: "push",
    status: "failed",
    failedStep: "npm test",
    error: "test failed",
    recovery: undefined,
    startedAt: "2026-11-18T12:00:00.000Z",
    finishedAt: "2026-11-18T12:01:00.000Z",
    steps: [],
  });
});

test("uses the repository check default and limits error text", () => {
  const status = createFailureStatus({
    error: "x".repeat(400),
    event: "push",
    runId: "123456",
    recovery: "restore failed",
    startedAt: null,
    steps: [],
    now: fixedNow,
  });

  expect(status.failedStep).toBe("repository check");
  expect(status.error).toBe("x".repeat(300));
  expect(status.recovery).toBe("restore failed");
});

test("formats a non-error failure value", () => {
  expect(
    createFailureStatus({
      error: null,
      event: "push",
      runId: "123456",
      startedAt: null,
      steps: [],
      now: fixedNow,
    }).error,
  ).toBe("null");
});
