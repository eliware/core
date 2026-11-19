import { expect, test } from "@jest/globals";
import summarizeBindStats from "../../../src/backend/metrics/dns-cache.mjs";

test("summarizes BIND cached record totals", () => {
  expect(summarizeBindStats("++ Cache DB RRsets ++\nA: 12\nAAAA: 3\n++ Resolver ++\n")).toEqual({
    totals: { rrsets: 15 },
    records: { A: 12, AAAA: 3 },
  });
  expect(
    summarizeBindStats(
      "++ Cache DB RRsets ++\nA: 1\n++ Resolver ++\n++ Cache DB RRsets ++\nA: 4\n++ Resolver ++\n",
    ).totals.rrsets,
  ).toBe(4);
  expect(() => summarizeBindStats("no cache data")).toThrow("unavailable");
});
