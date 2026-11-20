import { expect, test } from "@jest/globals";
import normalizeRepositoryPaths from "../../../src/pair/normalizers/repository-path.mjs";

test("normalizes repository-specific Eliware paths", () => {
  expect(normalizeRepositoryPaths("/eliware/core1/etc/config /eliware/core2/etc/config")).toBe(
    "/eliware/router/etc/config /eliware/router/etc/config",
  );
});

test("preserves unrelated paths and the repository root", () => {
  expect(normalizeRepositoryPaths("/eliware/core")).toBe("/eliware/core");
});
