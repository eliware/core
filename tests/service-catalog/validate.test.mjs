import { expect, test } from "@jest/globals";
import validateServiceCatalog from "../../src/service-catalog/validate.mjs";

const component = {
  id: "dns",
  name: "DNS",
  configPaths: ["etc/named.conf", "var/named/**"],
  health: { type: "systemd", unit: "named.service" },
  action: { type: "systemd", operation: "reload", unit: "named.service" },
};

test("accepts a valid service catalog", () => {
  expect(validateServiceCatalog({ version: 1, components: [component] })).toEqual([]);
});

test("accepts each supported local metric source", () => {
  const metrics = [
    { type: "interfaces" },
    { type: "routes" },
    { type: "arp" },
    { type: "frr" },
    { type: "vrrp", path: "/run/keepalived.json", pidPath: "/run/keepalived_vrrp.pid" },
    { type: "haproxy", socketPath: "/run/haproxy/admin.sock" },
    { type: "dhcp-leases", format: "isc", path: "/var/lib/dhcp/dhcpd.leases" },
    { type: "dhcp-leases", format: "dnsmasq", path: "/var/lib/misc/dnsmasq.leases" },
    { type: "dhcp-leases", format: "kea-csv", path: "/var/lib/kea/leases.csv" },
    { type: "dns-cache", path: "/var/cache/named.stats" },
    { type: "ntp" },
  ];
  expect(validateServiceCatalog({ version: 1, components: [{ ...component, metrics }] })).toEqual(
    [],
  );
});

test.each([
  [null, "only version and components"],
  [{ version: 2, components: [component] }, "version must be 1"],
  [{ version: 1, components: [] }, "at least one component"],
  [{ version: 1, components: [{ unsupported: true }] }, "unsupported fields"],
  [{ version: 1, components: [{ ...component, id: "Bad" }] }, "id must use"],
  [{ version: 1, components: [component, component] }, "id must be unique"],
  [
    { version: 1, components: [{ ...component, metrics: [{ type: "exec", command: "rm" }] }] },
    "metrics must contain",
  ],
  [
    {
      version: 1,
      components: [{ ...component, metrics: [{ type: "haproxy", socketPath: "relative.sock" }] }],
    },
    "metrics must contain",
  ],
  ...[
    null,
    "interfaces",
    [],
    { type: "interfaces", extra: true },
    { type: "ntp", extra: true },
    { type: "routes", extra: true },
    { type: "arp", extra: true },
    { type: "frr", extra: true },
    { type: "vrrp", path: "relative" },
    { type: "vrrp", pidPath: "/run/a\n" },
    { type: "haproxy" },
    { type: "haproxy", socketPath: "/run/a", extra: true },
    { type: "haproxy", socketPath: 2 },
    { type: "haproxy", socketPath: "/run/a\n" },
    { type: "dhcp-leases", format: "bad", path: "/var/lease" },
    { type: "dhcp-leases", format: "isc", path: "relative" },
    { type: "dhcp-leases", format: "isc", path: "/var/a\n" },
    { type: "dns-cache", path: "relative" },
    { type: "dns-cache", path: "/var/a\n" },
  ].map((metric) => [
    { version: 1, components: [{ ...component, metrics: [metric] }] },
    "metrics must contain",
  ]),
  [{ version: 1, components: [{ ...component, name: " " }] }, "name must be"],
  [{ version: 1, components: [{ ...component, configPaths: ["../secret"] }] }, "configPaths"],
  [{ version: 1, components: [{ ...component, configPaths: ["C:\\router"] }] }, "configPaths"],
  [{ version: 1, components: [{ ...component, configPaths: ["etc/*/named"] }] }, "configPaths"],
  [{ version: 1, components: [{ ...component, health: { type: "command" } }] }, "health must"],
  [
    {
      version: 1,
      components: [{ ...component, health: { type: "systemd", unit: "bad unit" } }],
    },
    "health.unit",
  ],
  [{ version: 1, components: [{ ...component, action: { type: "shell" } }] }, "action must"],
  [
    {
      version: 1,
      components: [{ ...component, action: { ...component.action, operation: "stop" } }],
    },
    "operation must",
  ],
  [
    {
      version: 1,
      components: [{ ...component, action: { ...component.action, unit: "bad unit" } }],
    },
    "action.unit",
  ],
])("rejects invalid catalog values %s", (value, message) => {
  expect(validateServiceCatalog(value).join(" ")).toContain(message);
});
