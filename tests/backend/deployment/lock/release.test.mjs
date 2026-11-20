import { expect, jest, test } from "@jest/globals";
import releaseDeploymentLock from "../../../../src/backend/deployment/lock/release.mjs";

test("releases an available deployment lock", () => {
  const releaseLock = jest.fn();
  const status = { update: jest.fn() };
  releaseDeploymentLock({ releaseLock, status });
  expect(releaseLock).toHaveBeenCalledTimes(1);
  expect(status.update).not.toHaveBeenCalled();
});

test("records lock cleanup errors without throwing", () => {
  const status = { update: jest.fn() };
  expect(() =>
    releaseDeploymentLock({
      releaseLock: () => {
        throw new Error("busy");
      },
      status,
    }),
  ).not.toThrow();
  expect(status.update).toHaveBeenCalledWith({
    lockReleaseError: "Deployment lock cleanup failed.",
  });
});
