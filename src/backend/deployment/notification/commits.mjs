import escapeMarkdown from "./escape.mjs";

export default function formatCommits(commits, repository) {
  if (!commits.length) return "No commit details were included.";
  const lines = commits.slice(0, 12).map((commit) => {
    const sha = typeof commit?.id === "string" ? commit.id : "";
    const summary = typeof commit?.message === "string" ? commit.message.split("\n", 1)[0] : "";
    const message = escapeMarkdown(summary || "Commit").slice(0, 180);
    if (!repository || !/^[a-f0-9]{7,64}$/iu.test(sha)) return `• ${message}`;
    const shortSha = escapeMarkdown(sha.slice(0, 7));
    return `• [${shortSha}](${repository.url}/commit/${sha}) ${message}`;
  });
  if (commits.length > lines.length) {
    const remaining = commits.length - lines.length;
    lines.push(`• And ${remaining} more ${remaining === 1 ? "commit" : "commits"}.`);
  }
  return lines.join("\n");
}
