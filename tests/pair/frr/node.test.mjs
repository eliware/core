import { expect, test } from "@jest/globals";
import createPairRepo from "../../../test-fixtures/core-pair.mjs";
import parseFrr from "../../../src/pair/frr-parser.mjs";
import validateFrrNode from "../../../src/pair/frr/node.mjs";

test("accepts a valid router node", () => {
  const parsed = parseFrr(createPairRepo("core1")["etc/frr/frr.conf"]);
  expect(validateFrrNode(parsed)).toEqual([]);
});

test("checks peer separation, peer weight, and weight range", () => {
  const node = parseFrr(createPairRepo("core1")["etc/frr/frr.conf"]);
  node.hostname = "wrong.example";
  node.peer.ip = node.routerId;
  node.weights.delete(node.peer.ip);
  node.weights.set("bad", 70000);
  const errors = validateFrrNode(node).join(" ");
  expect(errors).toContain("cannot use its own router ID");
  expect(errors).toContain("must set a weight for its peer");
  expect(errors).toContain("weight outside the valid range");
});
