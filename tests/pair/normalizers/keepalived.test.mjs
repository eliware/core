import { expect, test } from "@jest/globals";
import createPairRepo from "../../../test-fixtures/core-pair.mjs";
import normalizeKeepalived from "../../../src/pair/normalizers/keepalived.mjs";

test("normalizes Keepalived router roles and peer values", () => {
  const one = createPairRepo("core1")["etc/keepalived/keepalived.conf"];
  const two = createPairRepo("core2")["etc/keepalived/keepalived.conf"];
  expect(normalizeKeepalived("etc/keepalived/keepalived.conf", one)).toBe(
    normalizeKeepalived("etc/keepalived/keepalived.conf", two),
  );
  expect(normalizeKeepalived("other.conf", one)).toBe(one);
});

test("normalizes every address in a unicast peer block", () => {
  const config = "unicast_peer {\n  192.0.2.1\n  192.0.2.2\n}\n";
  expect(normalizeKeepalived("etc/keepalived/keepalived.conf", config)).toBe(
    "unicast_peer {\n  <peer-address>\n  <peer-address>\n}\n",
  );
});
