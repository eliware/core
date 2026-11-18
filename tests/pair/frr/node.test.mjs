import { expect, test } from "@jest/globals";
import createPairRepo from "../../../test-fixtures/core-pair.mjs";
import parseFrr from "../../../src/pair/frr-parser.mjs";
import validateFrrNode from "../../../src/pair/frr/node.mjs";

test("accepts a valid router node", () => {
  const parsed = parseFrr(createPairRepo("core1")["etc/frr/frr.conf"]);
  expect(validateFrrNode(parsed, "core1")).toEqual([]);
});

test("checks node identity, peer separation, peer weight, and weight range", () => {
  const node = parseFrr(createPairRepo("core1")["etc/frr/frr.conf"]);
  node.hostname = "wrong.example";
  node.peer.ip = node.routerId;
  node.weights.delete(node.peer.ip);
  node.weights.set("bad", 70000);
  const errors = validateFrrNode(node, "core1").join(" ");
  expect(errors).toContain("hostname must identify core1");
  expect(errors).toContain("cannot use its own router ID");
  expect(errors).toContain("must set a weight for its core peer");
  expect(errors).toContain("weight outside the valid range");
});
