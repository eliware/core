import { expect, test } from "@jest/globals";
import validateKea from "../../src/preflight/kea.mjs";

test("validates all supported Kea service sections", () => {
  const dhcp4 = {
    Dhcp4: {
      loggers: [{}],
      subnet4: [{ id: 1, subnet: "10.0.0.0/24", pools: [{ pool: "10.0.0.2 - 10.0.0.9" }] }],
      "interfaces-config": { interfaces: [] },
      "lease-database": { type: "memfile" },
    },
  };
  const dhcp6 = {
    Dhcp6: {
      loggers: [{}],
      subnet6: [{ id: 1, subnet: "2001:db8::/64", pools: [{ pool: "2001:db8::/80" }] }],
      "interfaces-config": { interfaces: [] },
      "lease-database": { type: "memfile" },
    },
  };
  expect(validateKea("etc/kea/kea-dhcp4.conf", dhcp4)).toEqual([]);
  expect(validateKea("etc/kea/kea-dhcp6.conf", dhcp6)).toEqual([]);
  expect(
    validateKea("etc/kea/kea-dhcp4.conf", {
      Dhcp4: {
        loggers: [{}],
        subnet4: [{ id: 2, subnet: "10.0.0.0/24", pools: [{ pool: "10.0.0.128/25" }] }],
        "interfaces-config": { interfaces: [] },
        "lease-database": { type: "memfile" },
      },
    }),
  ).toEqual([]);
  expect(
    validateKea("etc/kea/kea-dhcp-ddns.conf", { DhcpDdns: { loggers: [{}], port: 53001 } }),
  ).toEqual([]);
  expect(
    validateKea("etc/kea/kea-ctrl-agent.conf", {
      "Control-agent": { loggers: [{}], "http-port": 8001, "control-sockets": {} },
    }),
  ).toEqual([]);
});

test("rejects invalid Kea identities, subnet ranges, pools, and ports", () => {
  const config = {
    Dhcp4: {
      loggers: [],
      subnet4: [
        { id: 0, subnet: "bad/99", pools: [{ pool: "bad" }] },
        { id: 0, subnet: "10.0.0.0/24" },
      ],
      "interfaces-config": {},
      "lease-database": {},
    },
  };
  expect(validateKea("etc/kea/kea-dhcp4.conf", config).join(" ")).toContain(
    "unique positive integers",
  );
  expect(validateKea("etc/kea/kea-dhcp4.conf", config).join(" ")).toContain(
    "invalid network prefix",
  );
  expect(validateKea("etc/kea/kea-dhcp4.conf", config).join(" ")).toContain("pool must define");
  expect(validateKea("etc/kea/kea-dhcp-ddns.conf", { DhcpDdns: { port: 0 } }).join(" ")).toContain(
    "port must be between",
  );
  expect(
    validateKea("etc/kea/kea-ctrl-agent.conf", { "Control-agent": { "http-port": 90000 } }).join(
      " ",
    ),
  ).toContain("http-port and control-sockets");
  expect(validateKea("etc/kea/other.conf", {}).join(" ")).toContain("expected one matching");
  const empty = {
    Dhcp4: {
      loggers: [],
      subnet4: [],
      "interfaces-config": { interfaces: [] },
      "lease-database": { type: "memfile" },
    },
  };
  expect(validateKea("etc/kea/kea-dhcp4.conf", empty).join(" ")).toContain(
    "subnet4 must be a nonempty array",
  );
  const malformedPool = { Dhcp4: { subnet4: [{ id: 1, subnet: "10.0.0.0/24/extra", pools: {} }] } };
  expect(validateKea("etc/kea/kea-dhcp4.conf", malformedPool).join(" ")).toContain(
    "pools must be an array",
  );
  expect(validateKea("etc/kea/kea-dhcp4.conf", malformedPool).join(" ")).toContain(
    "invalid network prefix",
  );
  expect(
    validateKea("etc/kea/kea-dhcp4.conf", { Dhcp4: { subnet4: [{ id: 3 }] } }).join(" "),
  ).toContain("invalid network prefix");
  expect(
    validateKea("etc/kea/kea-dhcp4.conf", {
      Dhcp4: { loggers: [], "interfaces-config": {}, "lease-database": {} },
    }).join(" "),
  ).toContain("subnet4 must be a nonempty array");
  expect(
    validateKea("etc/kea/kea-ctrl-agent.conf", { "Control-agent": { "http-port": 8001 } }).join(
      " ",
    ),
  ).toContain("http-port and control-sockets");
});
