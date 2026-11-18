import { expect, test } from "@jest/globals";
import validateSubnets from "../../../src/preflight/kea/subnets.mjs";

test("accepts valid IPv4 and IPv6 subnet ranges and pools", () => {
  expect(
    validateSubnets(
      [
        {
          id: 1,
          subnet: "10.0.0.0/24",
          pools: [{ pool: "10.0.0.2 - 10.0.0.9" }, { pool: "10.0.0.128/25" }],
        },
      ],
      "4",
    ),
  ).toEqual([]);
  expect(
    validateSubnets([{ id: 1, subnet: "2001:db8::/64", pools: [{ pool: "2001:db8::/80" }] }], "6"),
  ).toEqual([]);
});

test("rejects duplicate IDs, invalid prefixes, and malformed pools", () => {
  const errors = validateSubnets(
    [
      { id: 0, subnet: "bad/99", pools: [{ pool: "bad" }] },
      { id: 0, subnet: "10.0.0.0/24", pools: {} },
      {
        id: 4,
        subnet: "10.0.0.0/24",
        pools: [{ pool: "bad" }, { pool: "bad - 10.0.0.2" }, {}],
      },
      { id: 3, pools: [{ pool: "10.0.0.1/32" }] },
    ],
    "4",
  );
  expect(errors).toContain("subnet4 IDs must be unique positive integers");
  expect(errors).toContain("subnet4 has an invalid network prefix");
  expect(errors).toContain("subnet4 pools must be an array");
  expect(errors).toContain("subnet4 pool must define a start and end address");
});

test("rejects address families and network masks that do not match", () => {
  expect(validateSubnets([{ id: 1, subnet: "2001:db8::/129" }], "6")).toContain(
    "subnet6 has an invalid network prefix",
  );
  expect(validateSubnets([{ id: 1, subnet: "10.0.0.0/24/extra" }], "4")).toContain(
    "subnet4 has an invalid network prefix",
  );
});

test("rejects reversed and out-of-subnet address pools", () => {
  expect(
    validateSubnets(
      [
        {
          id: 1,
          subnet: "10.0.0.0/24",
          pools: [
            { pool: "10.0.0.9 - 10.0.0.2" },
            { pool: "10.0.1.1 - 10.0.1.9" },
            { pool: "10.0.1.0/24" },
          ],
        },
      ],
      "4",
    ),
  ).toEqual([
    "subnet4 pool must define a start and end address",
    "subnet4 pool must define a start and end address",
    "subnet4 pool must define a start and end address",
  ]);
});

test("handles compressed and embedded IPv4 IPv6 addresses", () => {
  expect(
    validateSubnets(
      [
        { id: 1, subnet: "::/0", pools: [{ pool: "::1/128" }] },
        {
          id: 2,
          subnet: "::ffff:192.0.2.0/120",
          pools: [{ pool: "::ffff:192.0.2.1 - ::ffff:192.0.2.9" }],
        },
        {
          id: 3,
          subnet: "2001:db8:0:0:0:0:0:1/128",
          pools: [{ pool: "2001:db8:0:0:0:0:0:1/128" }],
        },
      ],
      "6",
    ),
  ).toEqual([]);
});
