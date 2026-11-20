import { expect, test } from "@jest/globals";
import parseAddressOptions from "../../../../src/pair/keepalived/address/options.mjs";

test("returns no options for blank lines and comments", () => {
  expect(parseAddressOptions("   ")).toEqual([]);
  expect(parseAddressOptions(" # address comment")).toEqual([]);
});

test("splits options and strips unquoted comments", () => {
  expect(parseAddressOptions("192.0.2.1/24 dev eth0 # comment")).toEqual([
    "192.0.2.1/24",
    "dev",
    "eth0",
  ]);
});

test("keeps hashes and spaces inside quoted options", () => {
  expect(parseAddressOptions('192.0.2.1/24 label "vip# primary"')).toEqual([
    "192.0.2.1/24",
    "label",
    "vip# primary",
  ]);
});

test("keeps escaped hashes inside quoted options", () => {
  expect(parseAddressOptions('192.0.2.1/24 label "vip\\#0"')).toEqual([
    "192.0.2.1/24",
    "label",
    "vip#0",
  ]);
});
