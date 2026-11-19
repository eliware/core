import { expect, test } from "@jest/globals";
import summarizeNeighbors from "../../../src/backend/metrics/neighbors.mjs";

test("summarizes IPv4 neighbor states without changing address data", () => {
  expect(
    summarizeNeighbors([
      { dst: "10.0.0.1", lladdr: "00:11:22:33:44:55", dev: "lan0", state: ["REACHABLE"] },
      { dst: "10.0.0.2", dev: "lan0", state: ["FAILED", "NOARP"], flags: ["use"] },
      { dst: "10.0.0.3", state: "STALE" },
      { dst: "10.0.0.4" },
    ]),
  ).toEqual({
    totals: { neighbors: 4, reachable: 1, failed: 1 },
    neighbors: [
      {
        address: "10.0.0.1",
        mac: "00:11:22:33:44:55",
        interface: "lan0",
        state: "REACHABLE",
        flags: null,
      },
      {
        address: "10.0.0.2",
        mac: null,
        interface: "lan0",
        state: "FAILED, NOARP",
        flags: "use",
      },
      { address: "10.0.0.3", mac: null, interface: null, state: "STALE", flags: null },
      { address: "10.0.0.4", mac: null, interface: null, state: "unknown", flags: null },
    ],
  });
});
