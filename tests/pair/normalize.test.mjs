import { expect, test } from "@jest/globals";
import createPairRepo from "../../test-fixtures/core-pair.mjs";
import normalizePairFile from "../../src/pair/normalize.mjs";

const core1 = { peer: { ip: "10.0.0.2" } };
const core2 = { peer: { ip: "10.0.0.1" } };

test("normalizes router paths and FRR peer identities without changing other peers", () => {
  const input = [
    "hostname core1.purinton.us",
    "router bgp 65001",
    " bgp router-id 10.0.0.1",
    " neighbor 10.0.0.2 remote-as 65002",
    " neighbor 10.0.0.101 weight 180",
    "",
  ].join("\n");

  const output = normalizePairFile("etc/frr/frr.conf", input, core1);

  expect(output).toContain("hostname <router>");
  expect(output).toContain("router bgp <local-as>");
  expect(output).toContain("bgp router-id <local-address>");
  expect(output).toContain("neighbor <peer-address> remote-as <peer-as>");
  expect(output).toContain("neighbor 10.0.0.101 weight <ha-weight>");
});

test("normalizes current pair-specific config forms", () => {
  const one = createPairRepo("core1");
  const two = createPairRepo("core2");
  for (const file of ["etc/kea/kea-dhcp4.conf", "etc/keepalived/keepalived.conf"]) {
    expect(normalizePairFile(file, one[file], core1)).toBe(
      normalizePairFile(file, two[file], core2),
    );
  }
  expect(
    normalizePairFile(
      "etc/conntrackd/conntrackd.conf",
      one["etc/conntrackd/conntrackd.conf"],
      core1,
    ),
  ).toBe(
    normalizePairFile(
      "etc/conntrackd/conntrackd.conf",
      two["etc/conntrackd/conntrackd.conf"],
      core2,
    ),
  );
  expect(
    normalizePairFile(
      "scripts/frr-connected-prefix.sh",
      one["scripts/frr-connected-prefix.sh"],
      core1,
    ),
  ).toBe(
    normalizePairFile(
      "scripts/frr-connected-prefix.sh",
      two["scripts/frr-connected-prefix.sh"],
      core2,
    ),
  );
  expect(
    normalizePairFile("etc/sysconfig/ip6tables", "--ctstate RELATED,ESTABLISHED\r\n", core1),
  ).toBe("--ctstate ESTABLISHED,RELATED\n");
});

test("normalizes host paths in other configuration files", () => {
  expect(
    normalizePairFile("etc/named.conf", 'include "/eliware/core1/etc/zones";\r\n', core1),
  ).toBe('include "/eliware/core/etc/zones";\n');
  expect(normalizePairFile("etc/other.conf", "same\r\n", core1)).toBe("same\n");
});

test("leaves FRR text unchanged when the peer address is absent", () => {
  const input = "neighbor 10.0.0.2 remote-as 65002\n";
  expect(normalizePairFile("etc/frr/frr.conf", input, { peer: { ip: "" } })).toBe(input);
});
