import { expect, test } from "@jest/globals";
import createPairRepo from "../../test-fixtures/core-pair.mjs";
import validateKea from "../../src/pair/kea.mjs";

test("checks local server identity, reciprocal peers, and router URLs", () => {
  const first = createPairRepo("core1");
  const second = createPairRepo("core2");
  expect(
    validateKea(
      { routerId: "10.0.0.1", hostname: "core1.purinton.us" },
      first["etc/kea/kea-dhcp4.conf"],
    ),
  ).toEqual([]);
  expect(
    validateKea(
      { routerId: "10.0.0.2", hostname: "core2.purinton.us" },
      second["etc/kea/kea-dhcp4.conf"],
    ),
  ).toEqual([]);
});

test("reports missing, mislabeled, and misrouted HA peers", () => {
  const file = createPairRepo("core1")
    ["etc/kea/kea-dhcp4.conf"].replaceAll("core1.purinton.us", "wrong.purinton.us")
    .replace("secondary", "invalid")
    .replace("10.0.0.1:8000", "10.0.0.9:8000");

  const errors = validateKea({ routerId: "10.0.0.1", hostname: "core1.purinton.us" }, file).join(
    " ",
  );
  expect(errors).toContain("name its FRR hostname");
  expect(errors).toContain("one primary and one secondary");
  expect(errors).toContain("local HA URL must use its FRR router ID");
});

test("reports invalid Kea JSON", () => {
  expect(validateKea({ routerId: "10.0.0.1", hostname: "core1.purinton.us" }, "bad")).toEqual([
    "Kea DHCPv4 HA configuration is missing or invalid.",
  ]);
});

test("uses an empty default config when no text is provided", () => {
  expect(validateKea({ routerId: "10.0.0.1", hostname: "core1.purinton.us" })).toContain(
    "Kea DHCPv4 HA configuration is missing or invalid.",
  );
});
