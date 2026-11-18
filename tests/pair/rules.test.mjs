import { expect, test } from "@jest/globals";
import createPairRepo from "../../test-fixtures/core-pair.mjs";
import validatePair from "../../src/pair/rules.mjs";

function maps() {
  return [
    new Map(Object.entries(createPairRepo("core1"))),
    new Map(Object.entries(createPairRepo("core2"))),
  ];
}

test("coordinates successful pair validation", () => {
  const [left, right] = maps();

  expect(validatePair("core1", "core2", left, right)).toMatchObject({
    errors: [],
    nodes: new Map([
      ["core1", { routerId: "10.0.0.1", hostname: "core1.purinton.us" }],
      ["core2", { routerId: "10.0.0.2", hostname: "core2.purinton.us" }],
    ]),
  });
});

test("rejects duplicate names and stops when FRR configuration is missing", () => {
  const [left, right] = maps();

  expect(validatePair("same", "same", left, right)).toEqual({
    errors: ["Compare requires two repositories with different package names."],
  });

  left.delete("etc/frr/frr.conf");
  expect(validatePair("core1", "core2", left, right).errors).toContain(
    "Both repos need a parsable etc/frr/frr.conf file.",
  );
});
