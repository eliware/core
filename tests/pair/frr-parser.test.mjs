import { expect, test } from "@jest/globals";
import createPairRepo from "../../test-fixtures/core-pair.mjs";
import parseFrr from "../../src/pair/frr-parser.mjs";

test("parses FRR node identity, peer, neighbors, and weights", () => {
  const config = createPairRepo("core1")["etc/frr/frr.conf"];
  const parsed = parseFrr(config);
  expect(parsed).toMatchObject({
    hostname: "core1.purinton.us",
    routerId: "10.0.0.1",
    peer: { ip: "10.0.0.2", asn: 65002 },
  });
  expect(parsed.weights.get("10.0.0.2")).toBe(250);
  expect(parsed.neighbors.has("10.0.0.2")).toBe(true);
});

test("rejects text without the required FRR identity and peer fields", () => {
  expect(parseFrr()).toBeNull();
  expect(parseFrr("hostname core1.example\nrouter bgp 65001\n")).toBeNull();
});

test.each([
  "hostname conflicting.example",
  "router bgp 65003",
  " bgp router-id 10.0.0.9",
  " neighbor 10.0.0.9 description core peer",
  " neighbor 10.0.0.2 remote-as 65003",
])("rejects duplicate required FRR declarations: %s", (declaration) => {
  const config = createPairRepo("core1")["etc/frr/frr.conf"];
  expect(parseFrr(`${config}\n${declaration}`)).toBeNull();
});
