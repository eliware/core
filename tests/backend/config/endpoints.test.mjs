import { expect, test } from "@jest/globals";
import validateEndpoints from "../../../src/backend/config/endpoints.mjs";

test("accepts different dashboard and webhook endpoints", () => {
  expect(() => validateEndpoints(9300, 9301)).not.toThrow();
});

test("rejects the same dashboard and webhook endpoint", () => {
  expect(() => validateEndpoints(9300, 9300)).toThrow(
    "PORT and WEBHOOK_PORT must use different TCP endpoints.",
  );
});
