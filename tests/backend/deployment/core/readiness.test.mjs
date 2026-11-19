import { expect, jest, test } from "@jest/globals";
import checkCoreReadiness from "../../../../src/backend/deployment/core/readiness.mjs";

const ready = (overrides = {}) => ({
  port: 9300,
  serviceUnit: "core.service",
  run: jest.fn().mockResolvedValue(undefined),
  fetcher: jest.fn().mockResolvedValue({ status: 200 }),
  pause: jest.fn().mockResolvedValue(undefined),
  now: jest.fn().mockReturnValue(0),
  timeoutMs: 100,
  ...overrides,
});

test("accepts active Core when the readiness route returns HTTP 200", async () => {
  const input = ready();
  await expect(checkCoreReadiness(input)).resolves.toBeUndefined();
  expect(input.fetcher).toHaveBeenCalledWith("http://127.0.0.1:9300/ready");
});

test("retries a non-ready response", async () => {
  const input = ready({
    fetcher: jest.fn().mockResolvedValueOnce({ status: 503 }).mockResolvedValue({ status: 200 }),
  });
  await expect(checkCoreReadiness(input)).resolves.toBeUndefined();
  expect(input.pause).toHaveBeenCalledTimes(1);
});

test("reports the last service error after the health timeout", async () => {
  const input = ready({
    run: jest.fn().mockRejectedValue(new Error("inactive")),
    now: jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(100),
  });
  await expect(checkCoreReadiness(input)).rejects.toThrow(
    "Core did not become healthy after restart: inactive",
  );
});

test("reports a timeout when no health check can run", async () => {
  await expect(checkCoreReadiness(ready({ timeoutMs: 0 }))).rejects.toThrow(
    "Core did not become healthy after restart: timeout",
  );
});
