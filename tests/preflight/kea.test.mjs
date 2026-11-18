import { expect, test } from "@jest/globals";
import validateKea from "../../src/preflight/kea.mjs";

test("validates DHCP service sections", () => {
  for (const [file, section] of [
    ["etc/kea/kea-dhcp4.conf", "Dhcp4"],
    ["etc/kea/kea-dhcp6.conf", "Dhcp6"],
  ]) {
    expect(
      validateKea(file, {
        [section]: {
          loggers: [{}],
          [`subnet${section.slice(-1)}`]: [
            { id: 1, subnet: section === "Dhcp4" ? "10.0.0.0/24" : "2001:db8::/64" },
          ],
          "interfaces-config": { interfaces: [] },
          "lease-database": { type: "memfile" },
        },
      }),
    ).toEqual([]);
  }
});

test("validates DDNS and control agent settings", () => {
  expect(
    validateKea("etc/kea/kea-dhcp-ddns.conf", { DhcpDdns: { loggers: [{}], port: 53001 } }),
  ).toEqual([]);
  expect(
    validateKea("etc/kea/kea-ctrl-agent.conf", {
      "Control-agent": { loggers: [{}], "http-port": 8001, "control-sockets": {} },
    }),
  ).toEqual([]);
  expect(validateKea("etc/kea/kea-dhcp-ddns.conf", { DhcpDdns: { port: 0 } })).toContain(
    "port must be between 1 and 65535",
  );
  expect(
    validateKea("etc/kea/kea-ctrl-agent.conf", { "Control-agent": { "http-port": 90000 } }),
  ).toContain("http-port and control-sockets are required and valid");
});

test("rejects unmatched service identities and missing service settings", () => {
  expect(validateKea("etc/kea/other.conf", {})).toContain(
    "expected one matching Kea service object",
  );
  expect(validateKea("etc/kea/kea-dhcp4.conf", { Dhcp4: { loggers: [] } })).toEqual(
    expect.arrayContaining([
      "loggers must be a nonempty array",
      "subnet4 must be a nonempty array",
      "interfaces-config.interfaces must be an array",
      "lease-database.type is required",
    ]),
  );
});
