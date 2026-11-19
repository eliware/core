import { expect, jest, test } from "@jest/globals";
import summarizeBindStats from "../../../src/backend/metrics/dns-cache.mjs";
import collectServiceMetric from "../../../src/backend/metrics/collect/services.mjs";

test("collects DNS cache files through the service collector", async () => {
  const readFile = jest.fn().mockResolvedValue("++ Cache DB RRsets ++\nA: 2\n++ Resolver ++\n");
  await expect(
    collectServiceMetric({ type: "dns-cache", path: "/stats" }, { readFile }),
  ).resolves.toEqual({ totals: { rrsets: 2 }, records: { A: 2 } });
  expect(readFile).toHaveBeenCalledWith("/stats", "utf8");
});

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
