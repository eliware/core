import { expect, test } from "@jest/globals";
import createPairRepo from "../../../test-fixtures/core-pair.mjs";
import normalizeShell from "../../../src/pair/normalizers/shell.mjs";

test("normalizes the connected prefix address", () => {
  const one = createPairRepo("core1")["scripts/frr-connected-prefix.sh"];
  const two = createPairRepo("core2")["scripts/frr-connected-prefix.sh"];
  expect(normalizeShell("scripts/frr-connected-prefix.sh", one)).toBe(
    normalizeShell("scripts/frr-connected-prefix.sh", two),
  );
  expect(normalizeShell("other.sh", one)).toBe(one);
});
