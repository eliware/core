import { expect, test } from "@jest/globals";
import normalizeFrr from "../../../src/pair/normalizers/frr.mjs";

test("normalizes FRR identities and peer tokens", () => {
  const input = [
    "hostname core1.example",
    "router bgp 65001",
    " bgp router-id 10.0.0.1",
    " neighbor 10.0.0.2 remote-as 65002",
    " neighbor 10.0.0.101 weight 180",
  ].join("\n");
  const result = normalizeFrr("etc/frr/frr.conf", input, { peer: { ip: "10.0.0.2" } });
  expect(result).toContain("hostname <router>");
  expect(result).toContain("router bgp <local-as>");
  expect(result).toContain("bgp router-id <local-address>");
  expect(result).toContain("neighbor <peer-address> remote-as <peer-as>");
  expect(result).toContain("neighbor 10.0.0.101 weight <ha-weight>");
  expect(normalizeFrr("etc/frr/frr.conf", input, { peer: { ip: "" } })).toContain(
    "neighbor 10.0.0.2 remote-as 65002",
  );
  expect(normalizeFrr("other.conf", input)).toBe(input);
});
