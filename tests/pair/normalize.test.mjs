import { expect, test } from "@jest/globals";
import normalizePairFile from "../../src/pair/normalize.mjs";

test("normalizes line endings and shared router paths", () => {
  expect(normalizePairFile("etc/named.conf", 'include "/eliware/core1/etc/zones";\r\n')).toBe(
    'include "/eliware/core/etc/zones";\n',
  );
  expect(normalizePairFile("etc/other.conf", "same\r\n")).toBe("same\n");
});
