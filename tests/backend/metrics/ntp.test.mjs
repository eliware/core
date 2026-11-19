import { expect, test } from "@jest/globals";
import parseChronyTracking from "../../../src/backend/metrics/ntp.mjs";

test("reports chrony synchronization state and offsets", () => {
  const result = parseChronyTracking(
    "Reference ID : 1.1.1.1\nStratum : 2\nSystem time : 0.01 seconds slow\nLast offset : 0.001\nRMS offset : 0.002\nRef time (UTC) : Thu Nov 19 12:00:00 2026\nLeap status : Normal\n",
  );
  expect(result).toMatchObject({ synchronized: true, stratum: 2, leapStatus: "Normal" });
  expect(parseChronyTracking("Stratum: invalid\nLeap status: Not synchronised")).toMatchObject({
    synchronized: false,
    stratum: null,
  });
  expect(() => parseChronyTracking("not tracking")).toThrow("unavailable");
});
