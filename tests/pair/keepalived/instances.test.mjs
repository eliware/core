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
});

test("rejects empty and incomplete instances", () => {
  expect(parseInstances("")).toBeNull();
  expect(parseInstances("vrrp_instance VI { state MASTER")).toBeNull();
  expect(parseInstances("vrrp_instance VI { state MASTER }").get("VI")).toMatchObject({
    state: "MASTER",
  });
});

test("rejects duplicate VRRP instance names", () => {
  const source = createPairRepo("core1")["etc/keepalived/keepalived.conf"];
  const duplicate = `${source}\\n${source}`;
  expect(parseInstances(duplicate)).toBeNull();
});

test("rejects duplicate required instance settings", () => {
  const source = createPairRepo("core1")["etc/keepalived/keepalived.conf"];
  const duplicate = source.replace("state MASTER", "state MASTER\n state BACKUP");
  expect(parseInstances(duplicate).get("VI_169").state).toBeUndefined();
});

test("ignores braces inside comments and quoted values", () => {
  const source = createPairRepo("core1")["etc/keepalived/keepalived.conf"];
  const text = `# } vrrp_instance ignored {\n${source.replace(
    "state MASTER",
    'state MASTER\n notify_master "/usr/bin/echo \\" {\n }" # }',
  )}`;

  expect(parseInstances(text).size).toBe(2);
});
