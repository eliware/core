import { expect, test } from "@jest/globals";
import createPairRepo from "../../../test-fixtures/core-pair.mjs";
import normalizeConntrackd from "../../../src/pair/normalizers/conntrackd.mjs";

test("normalizes conntrackd local and peer addresses", () => {
  const one = createPairRepo("core1")["etc/conntrackd/conntrackd.conf"];
  const two = createPairRepo("core2")["etc/conntrackd/conntrackd.conf"];
  expect(normalizeConntrackd("etc/conntrackd/conntrackd.conf", one)).toBe(
    normalizeConntrackd("etc/conntrackd/conntrackd.conf", two),
  );
  expect(normalizeConntrackd("other.conf", one)).toBe(one);
});
