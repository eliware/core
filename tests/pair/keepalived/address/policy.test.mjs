import { expect, test } from "@jest/globals";
import isUsableVirtualAddress from "../../../../src/pair/keepalived/address/policy.mjs";

test.each([
  "192.0.2.0/24",
  "192.0.2.255/24",
  "0.0.0.0/0",
  "255.255.255.255/0",
  "0.0.0.0/32",
  "255.255.255.255/32",
])("rejects IPv4 network or broadcast address %s", (address) => {
  expect(isUsableVirtualAddress(address)).toBe(false);
});

test.each(["192.0.2.1/24", "192.0.2.0/31", "192.0.2.1/32"])(
  "accepts usable host addresses %s",
  (address) => {
    expect(isUsableVirtualAddress(address)).toBe(true);
  },
);

test.each(["invalid/24", "192.0.2.1", "192.0.2.1/33", "192.0.2.1/-1"])(
  "rejects malformed virtual address %s",
  (address) => {
    expect(isUsableVirtualAddress(address)).toBe(false);
  },
);
