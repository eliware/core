import escapeMarkdown from "./escape.mjs";

export default function formatFileChanges(commits) {
  const groups = [
    ["New", "added"],
    ["Modified", "modified"],
    ["Deleted", "removed"],
  ];
  return groups.flatMap(([label, property]) => {
    const files = [
      ...new Set(
        commits.flatMap((commit) => (Array.isArray(commit?.[property]) ? commit[property] : [])),
      ),
    ].filter((file) => typeof file === "string");
    if (!files.length) return [];
    const listed = files.slice(0, 12).map(escapeMarkdown).join("\n");
    const remaining = files.length - 12;
    const remainder =
      remaining > 0 ? `\nAnd ${remaining} more ${remaining === 1 ? "file" : "files"}.` : "";
    return [{ name: `${label} (${files.length})`, value: `${listed}${remainder}` }];
  });
}
