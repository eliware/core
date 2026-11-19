import { expect, test } from "@jest/globals";
import summarizeInterfaces from "../../../src/backend/metrics/interfaces.mjs";

test("sums interface states and traffic counters", () => {
  expect(
    summarizeInterfaces([
      {
        ifname: "eth0",
        operstate: "UP",
        addr_info: [
          { family: "inet", local: "10.0.0.1", prefixlen: 24, scope: "global" },
          { family: "inet6", local: "fe80::1", prefixlen: 64 },
        ],
        stats64: {
          rx: { bytes: 10, packets: 2, errors: 1 },
          tx: { bytes: 20, packets: 3, dropped: 2 },
        },
      },
    ]),
  ).toEqual({
    totals: {
      interfaces: 1,
      up: 1,
      rxBytes: 10,
      txBytes: 20,
      rxPackets: 2,
      txPackets: 3,
      errors: 1,
      dropped: 2,
    },
    interfaces: [
      {
        name: "eth0",
        state: "up",
        addresses: ["inet 10.0.0.1/24 (global)", "inet6 fe80::1/64"],
        rxBytes: 10,
        txBytes: 20,
        rxPackets: 2,
        txPackets: 3,
        errors: 1,
        dropped: 2,
      },
    ],
  });
  expect(summarizeInterfaces([]).totals.interfaces).toBe(0);
  expect(
    summarizeInterfaces([
      { ifname: "eth1", operstate: "DOWN", stats: { rx: { bytes: 4 }, tx: {} } },
      { ifname: "eth2" },
    ]),
  ).toMatchObject({
    totals: { interfaces: 2, up: 0, rxBytes: 4, txBytes: 0 },
    interfaces: [{ state: "down" }, { state: "unknown" }],
  });
});
