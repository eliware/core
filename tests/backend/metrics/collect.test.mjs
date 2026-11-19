import { expect, jest, test } from "@jest/globals";
import collectMetric from "../../../src/backend/metrics/collect.mjs";

test("dispatches router metrics to the router collector", async () => {
  const run = jest.fn().mockResolvedValue({
    stdout: '[{"ifname":"eth0","operstate":"UP","addr_info":[]}]',
  });
  await expect(collectMetric({ type: "interfaces" }, { run })).resolves.toMatchObject({
    totals: { interfaces: 1, up: 1 },
  });
  expect(run).toHaveBeenCalledWith("ip", ["-j", "-s", "address", "show"], {
    timeout: 10_000,
  });
});

test("dispatches service metrics to the service collector", async () => {
  const readFile = jest.fn().mockResolvedValue("++ Cache DB RRsets ++\nA: 2\n++ Resolver ++\n");
  await expect(collectMetric({ type: "dns-cache", path: "/stats" }, { readFile })).resolves.toEqual(
    { totals: { rrsets: 2 }, records: { A: 2 } },
  );
  expect(readFile).toHaveBeenCalledWith("/stats", "utf8");
});

test("rejects unsupported metric types", async () => {
  await expect(collectMetric({ type: "unknown" })).rejects.toThrow("Unsupported metric type");
});
