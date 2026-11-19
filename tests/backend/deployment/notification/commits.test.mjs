import { expect, test } from "@jest/globals";
import formatCommits from "../../../../src/backend/deployment/notification/commits.mjs";

test("formats missing and unlinked commit details", () => {
  expect(formatCommits([], null)).toBe("No commit details were included.");
  expect(formatCommits([{ id: "bad", message: "" }], null)).toBe("• Commit");
  expect(formatCommits([{ id: "bad", message: 42 }], { url: "https://github.com/a/b" })).toBe(
    "• Commit",
  );
});

test("links valid commits and truncates summaries", () => {
  const repository = { url: "https://github.com/eliware/core" };
  const summary = `${"a".repeat(181)}\ndetails`;
  const value = formatCommits([{ id: "a".repeat(40), message: summary }], repository);
  expect(value).toContain(`[aaaaaaa](${repository.url}/commit/${"a".repeat(40)})`);
  expect(value.endsWith("a".repeat(180))).toBe(true);
});

test.each([
  [13, "And 1 more commit."],
  [14, "And 2 more commits."],
])("summarizes %s excess commits", (count, summary) => {
  const commits = Array.from({ length: count }, () => ({}));
  expect(formatCommits(commits, null)).toContain(summary);
});
