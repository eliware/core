import { expect, test } from "@jest/globals";
import createPairRepo from "../../../test-fixtures/core-pair.mjs";
import parseFrr from "../../../src/pair/frr-parser.mjs";
import validateFrrWeights from "../../../src/pair/frr/weights.mjs";

test("accepts reciprocal route preferences", () => {
  const left = parseFrr(createPairRepo("core1")["etc/frr/frr.conf"]);
  const right = parseFrr(createPairRepo("core2")["etc/frr/frr.conf"]);
  expect(validateFrrWeights(left, right)).toEqual([]);
});

test("rejects changed weights that do not reverse the neighbor ranking", () => {
  const left = parseFrr(createPairRepo("core1")["etc/frr/frr.conf"]);
  const right = parseFrr(
    createPairRepo("core2")
      ["etc/frr/frr.conf"].replace("neighbor 10.0.0.10 weight 300", "neighbor 10.0.0.10 weight 250")
      .replace("neighbor 10.0.0.20 weight 200", "neighbor 10.0.0.20 weight 150"),
  );
  expect(validateFrrWeights(left, right)).toContain(
    "FRR weight differences must express reciprocal high availability preferences.",
  );
});
