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
