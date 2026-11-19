import { expect, test } from "@jest/globals";
import summarizeFrr from "../../../src/backend/metrics/frr.mjs";

test("summarizes FRR BGP peers and route paths", () => {
  expect(
    summarizeFrr(
      {
        ipv4Unicast: {
          peers: {
            "10.0.0.2": { hostname: "router-b", remoteAs: 65002, state: "Established", pfxRcd: 3 },
            "10.0.0.3": { remoteAs: 65003, state: "Idle" },
          },
        },
      },
      {
        "10.0.0.0/24": [{ protocol: "bgp", nexthops: [{ ip: "10.0.0.2" }], selected: true }],
      },
    ),
  ).toEqual({
    totals: { peers: 2, established: 1, down: 1, routes: 1 },
    peers: [
      {
        address: "10.0.0.2",
        description: "router-b",
        remoteAs: 65002,
        state: "Established",
        prefixesReceived: 3,
        prefixesSent: null,
        uptime: null,
      },
      {
        address: "10.0.0.3",
        description: null,
        remoteAs: 65003,
        state: "Idle",
        prefixesReceived: null,
        prefixesSent: null,
        uptime: null,
      },
    ],
    routes: [
      {
        prefix: "10.0.0.0/24",
        protocol: "bgp",
        nexthops: ["10.0.0.2"],
        metric: null,
        selected: true,
      },
    ],
  });
});

test("handles empty FRR route and peer tables", () => {
  expect(summarizeFrr("{}", "{}")).toEqual({
    totals: { peers: 0, established: 0, down: 0, routes: 0 },
    peers: [],
    routes: [],
  });
});

test("supports FRR peer aliases, route aliases, and array route output", () => {
  expect(
    summarizeFrr(
      JSON.stringify({
        peers: {
          "10.0.0.9": {
            description: "fallback name",
            remoteAs: null,
            remote_as: 65009,
            state: null,
            peerState: "Established",
            pfxRcd: null,
            prefixReceived: 0,
            pfxSnt: null,
            prefixSent: 5,
            peerUptime: "1d",
          },
          "10.0.0.10": {},
        },
        ipv4Unicast: null,
        ignored: 1,
      }),
      [
        {
          prefix: "10.0.0.0/24",
          protocol: null,
          type: "connected",
          nexthops: [{ gateway: "10.0.0.1" }, { interfaceName: "lan0" }, { ip: "", gateway: "" }],
          metric: 0,
          selected: null,
          bestpath: false,
        },
      ],
    ),
  ).toMatchObject({
    totals: { peers: 2, established: 1, down: 1, routes: 1 },
    peers: [
      {
        description: "fallback name",
        remoteAs: 65009,
        state: "Established",
        prefixesReceived: 0,
        prefixesSent: 5,
        uptime: "1d",
      },
      {
        address: "10.0.0.10",
        description: null,
        remoteAs: null,
        state: "unknown",
        prefixesReceived: null,
        prefixesSent: null,
        uptime: null,
      },
    ],
    routes: [
      {
        prefix: "10.0.0.0/24",
        protocol: "connected",
        nexthops: ["10.0.0.1", "lan0"],
        metric: 0,
        selected: false,
      },
    ],
  });
  expect(summarizeFrr({}, null).routes).toEqual([]);
  expect(summarizeFrr(null, "{}").peers).toEqual([]);
  expect(summarizeFrr({ ignored: null, count: 1 }, "{}").peers).toEqual([]);
  expect(summarizeFrr({}, { "10.0.0.0/24": {} }).routes[0]).toMatchObject({
    protocol: null,
    nexthops: [],
    metric: null,
    selected: null,
  });
  expect(summarizeFrr({}, [{ network: "192.0.2.0/24" }, {}]).routes).toMatchObject([
    { prefix: "192.0.2.0/24" },
    { prefix: null },
  ]);
});
