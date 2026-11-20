import { expect, test } from "@jest/globals";
import collectVrrp from "../../../../src/backend/metrics/collect/vrrp.mjs";

test("summarizes the collected Keepalived snapshot", async () => {
  await expect(
    collectVrrp(
      { path: "/state" },
      { readFile: async () => '{"v1":[{"data":{"iname":"VI_LAN","state":2}}]}' },
    ),
  ).resolves.toMatchObject({ totals: { instances: 1, master: 1 } });
});
