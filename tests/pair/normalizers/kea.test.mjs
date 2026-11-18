import { expect, test } from "@jest/globals";
import createPairRepo from "../../../test-fixtures/core-pair.mjs";
import normalizeKea from "../../../src/pair/normalizers/kea.mjs";

test("normalizes the local Kea HA server name", () => {
  const one = createPairRepo("core1")["etc/kea/kea-dhcp4.conf"];
  const two = createPairRepo("core2")["etc/kea/kea-dhcp4.conf"];
  expect(normalizeKea("etc/kea/kea-dhcp4.conf", one)).toBe(
    normalizeKea("etc/kea/kea-dhcp4.conf", two),
  );
  expect(normalizeKea("other.conf", one)).toBe(one);
});

test("preserves malformed Kea text for validation reporting", () => {
  expect(normalizeKea("etc/kea/kea-dhcp4.conf", "not json")).toBe("not json");
});
