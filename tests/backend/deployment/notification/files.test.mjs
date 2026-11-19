import { expect, test } from "@jest/globals";
import formatFileChanges from "../../../../src/backend/deployment/notification/files.mjs";

test("groups unique changed files and skips empty groups", () => {
  expect(
    formatFileChanges([
      { added: ["a.conf", "a.conf", 3], modified: "bad", removed: ["old.conf"] },
      { added: ["b.conf"], modified: ["edit.conf"] },
    ]),
  ).toEqual([
    { name: "New (2)", value: "a.conf\nb.conf" },
    { name: "Modified (1)", value: "edit.conf" },
    { name: "Deleted (1)", value: "old.conf" },
  ]);
  expect(formatFileChanges([{}])).toEqual([]);
});

test.each([
  [13, "And 1 more file."],
  [14, "And 2 more files."],
])("summarizes %s excess changed files", (count, summary) => {
  const commits = [{ added: Array.from({ length: count }, (_, index) => `file-${index}`) }];
  expect(formatFileChanges(commits)[0].value).toContain(summary);
});
