import { expect, jest, test } from "@jest/globals";
import collectHaproxy from "../../../../../src/backend/metrics/collect/services/haproxy.mjs";

test("reads and parses HAProxy stats", async () => {
  const socket = jest
    .fn()
    .mockResolvedValue(
      "# pxname,svname,status,scur,stot,bin,bout,econ,eresp\nweb,BACKEND,UP,0,1,2,3,0,0\n",
    );
  await expect(
    collectHaproxy({ socketPath: "/run/haproxy.sock" }, { socket }),
  ).resolves.toMatchObject({
    totals: { backends: 1 },
  });
});
