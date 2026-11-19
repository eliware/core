import { expect, test } from "@jest/globals";
import parseEndpoints from "../../../src/backend/config/endpoints.mjs";

test("accepts different dashboard and webhook endpoints", () => {
  expect(parseEndpoints(9300, 9301)).toEqual({ tcpEndpoint: 9300, webhookEndpoint: 9301 });
});

test("rejects the same dashboard and webhook endpoint", () => {
  expect(() => parseEndpoints(9300, 9300)).toThrow(
    "PORT and WEBHOOK_PORT must use different TCP endpoints.",
  );
});

test.each(["NaN", "0", "65536", "1.5", "1e3", " 1000 ", "+1000", "", true])(
  "rejects invalid TCP endpoint value %s",
  (value) => {
    expect(() => parseEndpoints(value, "9301")).toThrow(
      "Set the TCP endpoint value to an integer from 1 through 65535",
    );
  },
);

test.each([undefined, "9300", "09300", 9300])("accepts decimal TCP endpoint %s", (value) => {
  expect(parseEndpoints(value, "9301").tcpEndpoint).toBe(9300);
});
