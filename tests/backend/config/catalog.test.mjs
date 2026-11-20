import { expect, test } from "@jest/globals";
import { resolve } from "node:path";
import loadCatalog from "../../../src/backend/config/catalog.mjs";

test("loads the service catalog from a repository", () => {
  expect(loadCatalog(resolve("test-fixtures/router-catalog")).components[0].health.unit).toBe(
    "named.service",
  );
});
