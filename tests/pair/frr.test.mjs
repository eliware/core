import { expect, test } from "@jest/globals";
import createPairRepo from "../../test-fixtures/core-pair.mjs";
import validateFrrPair from "../../src/pair/frr.mjs";

function texts() {
  return [createPairRepo("core1")["etc/frr/frr.conf"], createPairRepo("core2")["etc/frr/frr.conf"]];
}

test("validates reciprocal FRR peers and route weights", () => {
  expect(validateFrrPair(...texts()).errors).toEqual([]);
});

test("ignores unchanged baseline peers when checking reciprocal HA preferences", () => {
  const [core1, core2] = texts();
  const left = core1
    .replace(
      "neighbor 10.0.0.10 weight 300",
      "neighbor 10.0.0.10 weight 300\n neighbor 10.0.0.30 remote-as 65200\n neighbor 10.0.0.30 weight 100",
    )
    .replace(
      "neighbor 10.0.0.20 weight 200",
      "neighbor 10.0.0.20 weight 200\n neighbor 10.0.0.31 remote-as 65200\n neighbor 10.0.0.31 weight 100",
    );
  const right = core2
    .replace(
      "neighbor 10.0.0.10 weight 300",
      "neighbor 10.0.0.10 weight 200\n neighbor 10.0.0.30 remote-as 65200\n neighbor 10.0.0.30 weight 100",
    )
    .replace(
      "neighbor 10.0.0.20 weight 200",
      "neighbor 10.0.0.20 weight 300\n neighbor 10.0.0.31 remote-as 65200\n neighbor 10.0.0.31 weight 100",
    );

  expect(validateFrrPair(left, right).errors).toEqual([]);
});

test("reports missing FRR peer definitions", () => {
  expect(validateFrrPair("", "").errors).toEqual([
    "Both repos need a parsable etc/frr/frr.conf file.",
  ]);
});

test("uses empty default FRR text when no configs are supplied", () => {
  expect(validateFrrPair().errors[0]).toContain("parsable etc/frr/frr.conf");
});

test("reports local peer addresses and missing peer weights", () => {
  let [core1, core2] = texts();
  core1 = core1
    .replace("hostname core1.purinton.us", "hostname wrong.example")
    .replace("bgp router-id 10.0.0.1", "bgp router-id 10.0.0.2")
    .replace(" neighbor 10.0.0.2 weight 250\n", "");
  core2 = core2.replace("bgp router-id 10.0.0.2", "bgp router-id 10.0.0.1");

  const errors = validateFrrPair(core1, core2).errors.join(" ");
  expect(errors).toContain("cannot use its own router ID as its peer");
  expect(errors).toContain("must set a weight for its peer");
  expect(errors).toContain("peer addresses must point");
});

test("rejects invalid weights and different weighted neighbor sets", () => {
  const [core1, core2] = texts();
  const invalid = core1.replace("neighbor 10.0.0.10 weight 300", "neighbor 10.0.0.10 weight 70000");
  const missingWeight = core2.replace(" neighbor 10.0.0.20 weight 200", "");

  expect(validateFrrPair(invalid, core2).errors.join(" ")).toContain(
    "weight outside the valid range",
  );
  expect(validateFrrPair(core1, missingWeight).errors).toContain(
    "FRR route preference weights must cover the same neighbors on both routers.",
  );
});

test("allows HA-specific preferences across external neighbors", () => {
  const [core1, core2] = texts();
  const preferences = core2
    .replace(
      " neighbor 10.0.0.10 remote-as 65200",
      " neighbor 10.0.0.30 remote-as 65200\n neighbor 10.0.0.10 remote-as 65200",
    )
    .replace(
      " neighbor 10.0.0.10 weight 300",
      " neighbor 10.0.0.30 weight 250\n neighbor 10.0.0.10 weight 200",
    )
    .replace(" neighbor 10.0.0.20 remote-as 65200", " neighbor 10.0.0.20 remote-as 65200")
    .replace("neighbor 10.0.0.20 weight 200", "neighbor 10.0.0.20 weight 300");
  const left = core1.replace(
    " neighbor 10.0.0.20 weight 200",
    " neighbor 10.0.0.20 weight 200\n neighbor 10.0.0.30 remote-as 65200\n neighbor 10.0.0.30 weight 250",
  );
  expect(validateFrrPair(left, preferences).errors).toEqual([]);
});

test("rejects neighbor sets that differ even when weight keys match", () => {
  const [core1, core2] = texts();
  const altered = core2.replace(
    "neighbor 10.0.0.20 remote-as 65200",
    "neighbor 10.0.0.21 remote-as 65200",
  );

  expect(validateFrrPair(core1, altered).errors).toContain(
    "FRR neighbor sets must match across both repositories.",
  );
});

test("rejects route preference maps with different neighbor keys", () => {
  const [core1, core2] = texts();
  const altered = core2.replace("neighbor 10.0.0.20 weight 200", "neighbor 10.0.0.21 weight 200");

  expect(validateFrrPair(core1, altered).errors).toContain(
    "FRR route preference weights must cover the same neighbors on both routers.",
  );
});

test("rejects weight changes that do not reverse neighbor preference", () => {
  const [core1, core2] = texts();
  const altered = core2
    .replace("neighbor 10.0.0.10 weight 300", "neighbor 10.0.0.10 weight 250")
    .replace("neighbor 10.0.0.20 weight 200", "neighbor 10.0.0.20 weight 150");

  expect(validateFrrPair(core1, altered).errors).toContain(
    "FRR weight differences must express reciprocal high availability preferences.",
  );

  const oneLeft = core1.replace(/\n neighbor 10\.0\.0\.20 (?:remote-as 65200|weight 200)/gu, "");
  const oneRight = core2
    .replace(/\n neighbor 10\.0\.0\.20 (?:remote-as 65200|weight 200)/gu, "")
    .replace("neighbor 10.0.0.10 weight 300", "neighbor 10.0.0.10 weight 250");
  expect(validateFrrPair(oneLeft, oneRight).errors).toContain(
    "FRR weight differences must express reciprocal high availability preferences.",
  );
});

test("rejects reciprocal peer autonomous system mismatches", () => {
  const [core1, core2] = texts();
  const altered = core2.replace(
    "neighbor 10.0.0.1 remote-as 65001",
    "neighbor 10.0.0.1 remote-as 65003",
  );

  expect(validateFrrPair(core1, altered).errors).toContain(
    "FRR peer AS numbers must point to the partner router AS in both repos.",
  );
});
