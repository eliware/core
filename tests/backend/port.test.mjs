import { expect, test } from "@jest/globals";
import parseTcpEndpoint from "../../src/backend/port.mjs";

test.each(["NaN", "0", "65536", "1.5", "1e3", " 1000 ", "+1000", ""])(
  "rejects invalid TCP endpoint value %s",
  (value) => {
    expect(() => parseTcpEndpoint(value)).toThrow(
      "Set the TCP endpoint value to an integer from 1 through 65535",
    );
  },
);

test.each([undefined, "9300", "09300", 9300])("accepts decimal TCP endpoint %s", (value) => {
  expect(parseTcpEndpoint(value)).toBe(9300);
});
