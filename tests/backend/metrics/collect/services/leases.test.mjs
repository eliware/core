import { expect, jest, test } from "@jest/globals";
import collectLeases from "../../../../../src/backend/metrics/collect/services/leases.mjs";

test("reads and summarizes a lease file", async () => {
  const readFile = jest.fn().mockResolvedValue("");
  await expect(
    collectLeases({ path: "/leases", format: "dnsmasq" }, { readFile, now: () => new Date(0) }),
  ).resolves.toEqual({ totals: { activeLeases: 0 } });
  expect(readFile).toHaveBeenCalledWith("/leases", "utf8");
});
