import { expect, test } from "@jest/globals";
import createPairRepo from "../../test-fixtures/core-pair.mjs";
import validateKea from "../../src/pair/kea.mjs";

test("checks local server identity, reciprocal peers, and router URLs", () => {
  const first = createPairRepo("core1");
  const second = createPairRepo("core2");
  expect(validateKea("core1", { routerId: "10.0.0.1" }, first["etc/kea/kea-dhcp4.conf"])).toEqual(
    [],
  );
  expect(validateKea("core2", { routerId: "10.0.0.2" }, second["etc/kea/kea-dhcp4.conf"])).toEqual(
    [],
  );
});

test("reports missing, mislabeled, and misrouted HA peers", () => {
  const file = createPairRepo("core1")
    ["etc/kea/kea-dhcp4.conf"].replaceAll("core1.purinton.us", "wrong.purinton.us")
    .replace("10.0.0.1:8000", "10.0.0.9:8000");

  const errors = validateKea("core1", { routerId: "10.0.0.1" }, file).join(" ");
  expect(errors).toContain("must name itself");
  expect(errors).toContain("define core1.purinton.us as primary");
  expect(errors).toContain("HA URL must use its FRR router ID");
});

test("reports invalid Kea JSON", () => {
  expect(validateKea("core1", { routerId: "10.0.0.1" }, "bad")).toEqual([
    "Kea core1 DHCPv4 HA configuration is missing or invalid.",
  ]);
});

test("uses an empty default config when no text is provided", () => {
  expect(validateKea("core1", { routerId: "10.0.0.1" })).toContain(
    "Kea core1 DHCPv4 HA configuration is missing or invalid.",
  );
});
