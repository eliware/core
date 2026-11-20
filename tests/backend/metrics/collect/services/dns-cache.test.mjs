import { expect, jest, test } from "@jest/globals";
import collectDnsCache from "../../../../../src/backend/metrics/collect/services/dns-cache.mjs";

test("reads and summarizes DNS cache statistics", async () => {
  const readFile = jest.fn().mockResolvedValue("++ Cache DB RRsets ++\nA: 3\n++ Resolver ++\n");
  await expect(collectDnsCache({ path: "/stats" }, { readFile })).resolves.toBeDefined();
  expect(readFile).toHaveBeenCalledWith("/stats", "utf8");
});
