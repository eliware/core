import { expect, test } from "@jest/globals";
import resolveNotificationLinks from "../../../../src/backend/deployment/notification/links.mjs";

test("handles missing GitHub metadata", () => {
  expect(resolveNotificationLinks()).toEqual({ repository: null, compareUrl: undefined });
});

test("resolves a repository and a matching comparison link", () => {
  expect(
    resolveNotificationLinks({
      repository: { full_name: "eliware/core" },
      compare: "https://github.com/eliware/core/compare/old...new",
    }),
  ).toEqual({
    repository: { name: "eliware/core", url: "https://github.com/eliware/core" },
    compareUrl: "https://github.com/eliware/core/compare/old...new",
  });
});

test.each([
  { full_name: "bad repository", compare: "https://github.com/eliware/core/compare/a...b" },
  { full_name: "eliware/core", compare: "https://github.com/evil/repo/compare/a...b" },
  { full_name: "eliware/core", compare: "https://example.com/eliware/core/compare/a...b" },
])("rejects unsafe notification links", ({ full_name, compare }) => {
  const result = resolveNotificationLinks({ repository: { full_name }, compare });
  expect(result.compareUrl).toBeUndefined();
  if (full_name === "bad repository") expect(result.repository).toBeNull();
});
