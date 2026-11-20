import { expect, jest, test } from "@jest/globals";
import collectNtp from "../../../../../src/backend/metrics/collect/services/ntp.mjs";

test("runs chrony tracking and parses its output", async () => {
  const run = jest.fn().mockResolvedValue({ stdout: "Leap status : Normal\n" });
  await expect(collectNtp({ run, timeoutMs: 10_000 })).resolves.toMatchObject({
    synchronized: true,
  });
  expect(run).toHaveBeenCalledWith("chronyc", ["-n", "tracking"], { timeout: 10_000 });
});
