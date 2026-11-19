import { expect, jest, test } from "@jest/globals";
import createLockLifecycle from "../../../../src/backend/deployment/lock/lifecycle.mjs";

test("releases an optional lock once", () => {
  const releaseLock = jest.fn();
  const onReleased = jest.fn();
  const release = createLockLifecycle(releaseLock, { onReleased });

  release();
  release();

  expect(releaseLock).toHaveBeenCalledTimes(1);
  expect(onReleased).toHaveBeenCalledTimes(1);
  expect(() => createLockLifecycle(undefined)()).not.toThrow();
});

test("reports cleanup failures and retries the same release", () => {
  const failure = new Error("temporary cleanup failure");
  const releaseLock = jest.fn().mockImplementationOnce(() => {
    throw failure;
  });
  const onRetry = jest.fn();
  const onReleased = jest.fn();
  const release = createLockLifecycle(releaseLock, { onRetry, onReleased });

  expect(release).toThrow(failure);
  expect(onRetry).toHaveBeenCalledWith(release);
  onRetry.mock.calls[0][0]();

  expect(releaseLock).toHaveBeenCalledTimes(2);
  expect(onReleased).toHaveBeenCalledTimes(1);
  expect(() => release()).not.toThrow();
  expect(releaseLock).toHaveBeenCalledTimes(2);
});
