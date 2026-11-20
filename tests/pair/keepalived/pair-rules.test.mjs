import { expect, test } from "@jest/globals";
import createPairRepo from "../../../test-fixtures/core-pair.mjs";
import parseInstances from "../../../src/pair/keepalived/instances.mjs";
import validateKeepalivedPair from "../../../src/pair/keepalived/pair-rules.mjs";

const first = parseInstances(createPairRepo("core1")["etc/keepalived/keepalived.conf"]);
const second = parseInstances(createPairRepo("core2")["etc/keepalived/keepalived.conf"]);

test("accepts matching peers, roles, priorities, and virtual addresses", () => {
  expect(
    validateKeepalivedPair({ routerId: "10.0.0.1" }, { routerId: "10.0.0.2" }, first, second),
  ).toEqual([]);
});

test("reports a mismatched peer, role, and priority", () => {
  const altered = new Map(second);
  const instance = altered.get("VI_169");
  altered.set("VI_169", {
    ...instance,
    state: "BACKUP",
    priority: 102,
    peer: "10.0.0.9",
  });
  const errors = validateKeepalivedPair(
    { routerId: "10.0.0.1" },
    { routerId: "10.0.0.2" },
    first,
    altered,
  );
  expect(errors).toContain("Keepalived VI_169 peer addresses must be reciprocal.");
  expect(errors).toContain("Keepalived VI_169 MASTER priority must be higher.");
  const duplicateMaster = new Map(altered);
  duplicateMaster.set("VI_169", { ...instance, state: "MASTER", priority: 100 });
  expect(
    validateKeepalivedPair(
      { routerId: "10.0.0.1" },
      { routerId: "10.0.0.2" },
      first,
      duplicateMaster,
    ),
  ).toContain("Keepalived VI_169 must have one MASTER and one BACKUP.");
});
