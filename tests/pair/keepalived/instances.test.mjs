import { expect, test } from "@jest/globals";
import createPairRepo from "../../../test-fixtures/core-pair.mjs";
import parseInstances from "../../../src/pair/keepalived/instances.mjs";

test("parses VRRP values and sorts virtual addresses", () => {
  const text = createPairRepo("core1")["etc/keepalived/keepalived.conf"];
  const instances = parseInstances(text);
  expect(instances.get("VI_169")).toMatchObject({
    state: "MASTER",
    priority: 101,
    source: "10.0.0.1",
    peer: "10.0.0.2",
  });
  expect(instances.get("VI_169").vips).toEqual(["192.0.2.169/24"]);
});

test("rejects empty and incomplete instances", () => {
  expect(parseInstances("")).toBeNull();
  expect(parseInstances("vrrp_instance VI { state MASTER")).toBeNull();
  expect(parseInstances("vrrp_instance VI { state MASTER }").get("VI")).toMatchObject({ vips: [] });
});
