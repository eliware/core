import { expect, test } from "@jest/globals";
import createPairRepo from "../../test-fixtures/core-pair.mjs";
import validateNetworkPair from "../../src/pair/network.mjs";

const core1 = createPairRepo("core1");
const core2 = createPairRepo("core2");
const node1 = { routerId: "10.0.0.1" };
const node2 = { routerId: "10.0.0.2" };

test("checks reciprocal conntrack peers and router prefix scripts", () => {
  expect(
    validateNetworkPair(
      node1,
      node2,
      core1["etc/conntrackd/conntrackd.conf"],
      core2["etc/conntrackd/conntrackd.conf"],
      core1["scripts/frr-connected-prefix.sh"],
      core2["scripts/frr-connected-prefix.sh"],
    ),
  ).toEqual([]);
});

test("reports bad peer addresses and host prefixes", () => {
  const errors = validateNetworkPair(node1, node2, "bad", "bad", "address=bad", "address=bad");

  expect(errors).toContain("Conntrackd peer addresses must match the reciprocal FRR router IDs.");
  expect(errors).toContain("FRR connected prefix on core1 must use its local router ID.");
  expect(errors).toContain("FRR connected prefix on core2 must use its local router ID.");
});

test("uses empty default network files when inputs are omitted", () => {
  expect(validateNetworkPair(node1, node2).length).toBe(3);
});
