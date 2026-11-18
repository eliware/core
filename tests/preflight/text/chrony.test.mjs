import { expect, test } from "@jest/globals";
import validateChrony from "../../../src/preflight/text/chrony.mjs";

test("checks Chrony directive names and required arguments", () => {
  expect(
    validateChrony("chrony.conf", "pool pool.ntp.org iburst\nallow 10.0.0.0/24\nmakestep 1 3\n"),
  ).toEqual([]);
  expect(
    validateChrony("chrony.conf", "unknown item\nallow\nserver\nmakestep x y\n").join(" "),
  ).toContain("unknown chrony directive");
});
