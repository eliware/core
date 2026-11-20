import { expect, test } from "@jest/globals";
import extractInstanceFields from "../../../src/pair/keepalived/instance-fields.mjs";

test("extracts VRRP settings and preserves both instance bodies", () => {
  const body = " state MASTER { virtual_router_id 42 } ";
  const validationBody =
    " state MASTER { virtual_router_id 42 } priority 101 unicast_src_ip 10.0.0.1 unicast_peer { 10.0.0.2 } ";

  expect(extractInstanceFields(body, validationBody)).toEqual({
    id: "42",
    state: "MASTER",
    priority: 101,
    source: "10.0.0.1",
    peer: "10.0.0.2",
    body,
    validationBody,
  });
});

test("ignores duplicate settings and peer addresses", () => {
  const validationBody =
    "state MASTER state BACKUP priority 101 unicast_src_ip 10.0.0.1 unicast_peer { 10.0.0.2 10.0.0.3 }";

  expect(extractInstanceFields("", validationBody)).toMatchObject({
    id: undefined,
    state: undefined,
    peer: undefined,
  });
});
