import { expect, test } from "@jest/globals";
import summarizeVrrp from "../../../src/backend/metrics/vrrp.mjs";

test("summarizes Keepalived VRRP state, virtual addresses, and counters", () => {
  expect(
    summarizeVrrp({
      json_version: 1,
      v1: [
        {
          data: {
            iname: "VI_LAN",
            state: 2,
            ifp_ifname: "lan0",
            effective_priority: 101,
            vrid: 253,
            unicast_peers: ["10.0.0.2"],
            vips: ["10.0.0.254/24 dev lan0 scope global"],
          },
          stats: { advert_rcvd: 9, advert_sent: 12, become_master: 1 },
        },
        { data: { iname: "VI_WAN", state: 1 }, stats: {} },
        { data: { iname: "VI_PEER", state: 1, unicast_peer: [{ other: "value" }] } },
      ],
    }),
  ).toEqual({
    totals: { instances: 3, master: 1, backup: 2, fault: 0 },
    instances: [
      {
        name: "VI_LAN",
        state: "MASTER",
        interface: "lan0",
        priority: 101,
        virtualRouterId: 253,
        virtualAddresses: ["10.0.0.254/24"],
        peers: ["10.0.0.2"],
        advertisementsReceived: 9,
        advertisementsSent: 12,
        masterTransitions: 1,
      },
      {
        name: "VI_WAN",
        state: "BACKUP",
        interface: null,
        priority: null,
        virtualRouterId: null,
        virtualAddresses: [],
        peers: [],
        advertisementsReceived: null,
        advertisementsSent: null,
        masterTransitions: null,
      },
      {
        name: "VI_PEER",
        state: "BACKUP",
        interface: null,
        priority: null,
        virtualRouterId: null,
        virtualAddresses: [],
        peers: ["unknown"],
        advertisementsReceived: null,
        advertisementsSent: null,
        masterTransitions: null,
      },
    ],
  });
});

test("marks fault state and accepts the top-level instance array", () => {
  expect(summarizeVrrp([{ data: { iname: "VI_FAIL", state: 3 } }]).totals.fault).toBe(1);
});

test("reads version two and alternate state fields", () => {
  expect(
    summarizeVrrp({
      v2: {
        first: {
          data: {
            name: "VI_BACKUP",
            state: "BACKUP",
            interface: "wan0",
            base_priority: 90,
            virtual_router_id: 10,
            virtual_addresses: ["192.0.2.1/24 dev wan0"],
            unicast_peer: [{ ip: "192.0.2.2" }],
          },
        },
        second: { data: { state: 999 }, stats: {} },
        third: {},
      },
    }),
  ).toMatchObject({
    totals: { instances: 3, backup: 1, master: 0, fault: 0 },
    instances: [
      {
        name: "VI_BACKUP",
        state: "BACKUP",
        interface: "wan0",
        priority: 90,
        virtualRouterId: 10,
        virtualAddresses: ["192.0.2.1/24"],
        peers: ["192.0.2.2"],
      },
      { name: "Unknown instance", state: "UNKNOWN" },
      { name: "Unknown instance", state: "UNKNOWN" },
    ],
  });
});

test("supports the instances field and empty VRRP state", () => {
  expect(summarizeVrrp({ instances: [] })).toEqual({
    totals: { instances: 0, master: 0, backup: 0, fault: 0 },
    instances: [],
  });
  expect(summarizeVrrp({})).toMatchObject({ totals: { instances: 0 } });
  expect(
    summarizeVrrp({ instances: { one: { data: { name: "VI_ONE", state: "INIT", priority: 1 } } } }),
  ).toMatchObject({ instances: [{ name: "VI_ONE", state: "INIT", priority: 1 }] });
});
