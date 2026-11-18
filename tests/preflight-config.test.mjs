import { expect, test } from "@jest/globals";
import validateConfigFiles from "../src/preflight-config.mjs";

function setup() {
  const root = "C:/router";
  const contents = new Map([
    [
      "etc/kea/kea-dhcp4.conf",
      JSON.stringify({
        Dhcp4: {
          loggers: [{}],
          subnet4: [{ id: 1, subnet: "10.0.0.0/24", pools: [{ pool: "10.0.0.10 - 10.0.0.20" }] }],
          "interfaces-config": { interfaces: ["enX0"] },
          "lease-database": { type: "memfile" },
        },
      }),
    ],
    [
      "etc/wireguard/wg0.conf",
      "[Interface]\nAddress = 172.16.0.1/30\nListenPort = 51820\n[Peer]\nPublicKey = qM9ZUPZbPgNWOmLpF/M1jy8s4qc4YuxFObrKoDFkhTs=\nAllowedIPs = 172.16.0.2/32\n",
    ],
    [
      "etc/keepalived/keepalived.conf",
      "vrrp_instance VI_LAN { state MASTER\ninterface enX0\nvirtual_router_id 1\npriority 101\nunicast_src_ip 10.0.0.1\nunicast_peer { 10.0.0.2 }\nvirtual_ipaddress { 10.0.0.254/24 dev enX0 }\n}",
    ],
    ["etc/conntrackd/conntrackd.conf", "Sync { UDP { Port 3780 } }\nGeneral { HashSize 4096 }\n"],
    [
      "etc/named.conf",
      'options { directory "/var/named"; };\nzone "example.test" IN { type primary; file "zones/example.test.zone"; };\n',
    ],
    [
      "var/named/zones/example.test.zone",
      "$TTL 3600\n@ IN SOA ns.example.test. host.example.test. ( 1 3600 600 86400 300 )\n@ IN NS ns.example.test.\n@ IN A 10.0.0.1\n",
    ],
    [
      "etc/systemd/system/core.service",
      "[Unit]\nDescription=Core service\n[Service]\nType=oneshot\nExecStart=/eliware/core1/scripts/check.sh\n",
    ],
    [
      "etc/sysconfig/iptables",
      "*filter\n:INPUT DROP [0:0]\n:FORWARD DROP [0:0]\n:OUTPUT ACCEPT [0:0]\n-A INPUT -i lo -j ACCEPT\nCOMMIT\n",
    ],
    [
      "etc/frr/frr.conf",
      "frr defaults traditional\nrouter bgp 65001\n bgp router-id 10.0.0.1\n neighbor 10.0.0.2 remote-as 65002\n address-family ipv4 unicast\n neighbor 10.0.0.2 weight 100\n exit-address-family\n!\n",
    ],
    [
      "etc/haproxy/haproxy.cfg",
      "global\n maxconn 100\ndefaults\n mode tcp\nfrontend main\n bind 0.0.0.0:443\n default_backend app\nbackend app\n server one 127.0.0.1:8080 check\n",
    ],
    ["etc/chrony.conf", "pool pool.ntp.org iburst\nallow 10.0.0.0/24\nmakestep 1.0 3\n"],
    [
      "scripts/check.sh",
      '#!/usr/bin/env bash\nif true; then\n  for item in one two; do\n    echo "$item"\n  done\nfi\n',
    ],
  ]);
  const files = [...contents.keys()];
  const readFile = (path) => {
    const name = path.replaceAll("\\", "/").split("/router/").at(-1);
    if (!contents.has(name)) throw new Error("file missing");
    return contents.get(name);
  };
  return { root, files, contents, readFile };
}

test("validates router configuration with Node.js only", () => {
  const state = setup();
  const result = validateConfigFiles(state.root, state.files, { readFile: state.readFile });

  expect(result.lines).toEqual(["PASS Node.js configuration checks (12 files)"]);
  expect(result.errors).toEqual([]);
});

test("rejects malformed configuration, invalid references, and broken shell blocks", () => {
  const state = setup();
  state.contents.set(
    "etc/kea/kea-dhcp4.conf",
    JSON.stringify({ Dhcp4: { loggers: [], subnet4: [{ id: 0, subnet: "10.0.0.0/99" }] } }),
  );
  state.contents.set(
    "etc/wireguard/wg0.conf",
    "[Interface]\nAddress=bad\nListenPort=0\n[Peer]\nAllowedIPs=0.0.0.0/99\n",
  );
  state.contents.set("etc/named.conf", 'options {\nzone x { file "zones/missing.zone"; };');
  state.contents.set("var/named/zones/example.test.zone", "@ IN A nope\n");
  state.contents.set(
    "etc/sysconfig/iptables",
    "*filter\n:INPUT DROP [0:0]\n-A MISSING -j ACCEPT\nCOMMIT\n",
  );
  state.contents.set("etc/frr/frr.conf", "router bgp nope\nneighbor bad remote-as nope\n");
  state.contents.set(
    "etc/haproxy/haproxy.cfg",
    "frontend main\n default_backend missing\nbackend empty\n",
  );
  state.contents.set("etc/chrony.conf", "invalid-directive value\n");
  state.contents.set("scripts/check.sh", "#!/bin/bash\nif true; then\n echo 'open\n");
  const result = validateConfigFiles(state.root, state.files, { readFile: state.readFile });

  expect(result.errors.join(" ")).toContain("loggers must be a nonempty array");
  expect(result.errors.join(" ")).toContain("invalid network prefix");
  expect(result.errors.join(" ")).toContain(
    "referenced var/named/zones/missing.zone file is missing",
  );
  expect(result.errors.join(" ")).toContain("exactly one SOA record is required");
  expect(result.errors.join(" ")).toContain("rule has an unknown chain or missing target");
  expect(result.errors.join(" ")).toContain("router bgp section is required");
  expect(result.errors.join(" ")).toContain("backend missing is not defined");
  expect(result.errors.join(" ")).toContain("unknown chrony directive");
  expect(result.errors.join(" ")).toContain("quoted string is not closed");
});

test("reports invalid Kea JSONC syntax before domain validation", () => {
  const state = setup();
  state.contents.set("etc/kea/kea-dhcp4.conf", '{ "Dhcp4": ');
  const result = validateConfigFiles(state.root, ["etc/kea/kea-dhcp4.conf"], {
    readFile: state.readFile,
  });
  expect(result.errors).toContain(
    "FAIL etc/kea/kea-dhcp4.conf: invalid JSON syntax (ValueExpected).",
  );
  expect(result.errors).not.toContain(
    "FAIL etc/kea/kea-dhcp4.conf: expected one matching Kea service object.",
  );
});

test("reports unreadable tracked configuration", () => {
  const state = setup();
  const result = validateConfigFiles(state.root, ["etc/chrony.conf"], {
    readFile: () => {
      throw new Error("denied");
    },
  });

  expect(result.errors).toEqual(["FAIL etc/chrony.conf: could not read the file."]);
});

test("uses the default reader for a repository without router files", () => {
  const result = validateConfigFiles(process.cwd(), ["README.md", "scripts/entry.mjs"]);

  expect(result.lines).toEqual(["PASS Node.js configuration checks (0 files)"]);
  expect(result.errors).toEqual([]);
});

test("rejects null bytes in configuration text", () => {
  const state = setup();
  state.contents.set("etc/chrony.conf", "allow 10.0.0.0/24\0");
  const result = validateConfigFiles(state.root, ["etc/chrony.conf"], { readFile: state.readFile });

  expect(result.errors).toContain("FAIL etc/chrony.conf: file contains a null byte.");
});

test("requires router service files without a deployment-specific package identity", () => {
  const state = setup();
  const invalidName = validateConfigFiles(state.root, state.files, {
    readFile: state.readFile,
    repositoryName: "@eliware/other",
  });
  expect(
    invalidName.errors.some((error) => error.includes("required router configuration is missing")),
  ).toBe(true);

  const required = [
    "etc/chrony.conf",
    "etc/named.conf",
    "etc/frr/daemons",
    "etc/frr/frr.conf",
    "etc/haproxy/haproxy.cfg",
    "etc/kea/kea-dhcp4.conf",
    "etc/kea/kea-dhcp6.conf",
    "etc/kea/kea-dhcp-ddns.conf",
    "etc/kea/kea-ctrl-agent.conf",
    "etc/keepalived/keepalived.conf",
    "etc/conntrackd/conntrackd.conf",
    "etc/sysconfig/iptables",
    "etc/sysconfig/ip6tables",
    "etc/wireguard/wg0.conf",
  ];
  const core1 = validateConfigFiles(state.root, required, {
    readFile: () => "",
    repositoryName: "@eliware/core1",
  });
  expect(
    core1.errors.some((error) => error.includes("required router configuration is missing")),
  ).toBe(false);
});
