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

test("retains invalid virtual address entries for pair rejection", () => {
  const text = createPairRepo("core1")["etc/keepalived/keepalived.conf"].replace(
    "192.0.2.169/24",
    "invalid-address",
  );
  expect(parseInstances(text).get("VI_169").invalidVips).toEqual(["invalid-address", "missing"]);
});

test("accepts supported virtual address options and rejects unknown options", () => {
  const source = createPairRepo("core1")["etc/keepalived/keepalived.conf"];
  const valid = source.replace("192.0.2.169/24", "192.0.2.169/24 dev enX0 label vip0 notrack");
  expect(parseInstances(valid).get("VI_169").invalidVips).toEqual([]);
  const invalid = source.replace("192.0.2.169/24", "192.0.2.169/24 unknown-option");
  expect(parseInstances(invalid).get("VI_169").invalidVips).toEqual(["192.0.2.169/24"]);
  const missingOption = source.replace("192.0.2.169/24", "192.0.2.169/24 dev");
  expect(parseInstances(missingOption).get("VI_169").invalidVips).toEqual(["192.0.2.169/24"]);
  const empty = source.replace("192.0.2.169/24", "# no address");
  expect(parseInstances(empty).get("VI_169").invalidVips).toEqual(["missing"]);
});
