const SUCCESS_COLOR = 0x00ff00;
const FAILURE_COLOR = 0xff0000;

function escapeMarkdown(value) {
  return String(value ?? "")
    .replace(/[\\_*~`>|]/gu, "\\$&")
    .replace(/@(everyone|here)\b/giu, "@\u200b$1");
}

function resolveRepository(githubPayload) {
  const name = githubPayload?.repository?.full_name;
  if (typeof name !== "string" || !/^[\w.-]+\/[\w.-]+$/u.test(name)) return null;
  return { name, url: `https://github.com/${name}` };
}

function resolveCompareUrl(githubPayload, repository) {
  if (!repository) return undefined;
  const prefix = `${repository.url}/compare/`;
  return typeof githubPayload?.compare === "string" && githubPayload.compare.startsWith(prefix)
    ? githubPayload.compare
    : undefined;
}

function formatCommits(commits, repository) {
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

function formatFileChanges(commits) {
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

function formatSteps(steps) {
  const visibleSteps = steps.filter((step) => !step.internal);
  if (!visibleSteps.length) return "No deployment steps were recorded.";
  return visibleSteps
    .map((step) => {
      const icon = step.status === "passed" ? "✅" : step.status === "failed" ? "❌" : "⏳";
      const detail = step.detail ? `: ${escapeMarkdown(step.detail)}` : "";
      return `${icon} ${escapeMarkdown(step.name || "Unknown step")}${detail}`;
    })
    .join("\n");
}

function duration(startedAt, finishedAt) {
  const start = Date.parse(startedAt ?? "");
  const finish = Date.parse(finishedAt ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start) return undefined;
  return `${Math.round((finish - start) / 1000)} seconds`;
}

export default function createDeploymentDiscordNotification({
  status,
  runId,
  branch = "main",
  githubPayload = {},
  steps = [],
  failedStep,
  error,
  recovery,
  startedAt,
  finishedAt,
}) {
  const succeeded = status === "succeeded";
  const commits = Array.isArray(githubPayload.commits) ? githubPayload.commits : [];
  const repository = resolveRepository(githubPayload);
  const ref =
    typeof githubPayload.ref === "string" ? githubPayload.ref.replace(/^refs\/heads\//u, "") : "";
  const targetBranch = ref || branch;
  const compareUrl = resolveCompareUrl(githubPayload, repository);
  const fields = [
    { name: "Deployment ID", value: String(runId ?? "unknown"), inline: true },
    { name: "Branch", value: escapeMarkdown(targetBranch), inline: true },
    {
      name: "Repository",
      value: repository
        ? `[${escapeMarkdown(repository.name)}](${repository.url})`
        : "Unknown repository",
      inline: true,
    },
    { name: `Commits (${commits.length})`, value: formatCommits(commits, repository) },
    ...formatFileChanges(commits),
    { name: "Deployment steps", value: formatSteps(steps) },
  ];
  if (!succeeded && (failedStep || error)) {
    fields.push({
      name: "Failure",
      value: [failedStep ? `Failed at ${escapeMarkdown(failedStep)}.` : "Deployment failed.", error]
        .filter(Boolean)
        .map(escapeMarkdown)
        .join("\n"),
    });
  }
  if (recovery) fields.push({ name: "Recovery", value: escapeMarkdown(recovery) });
  const elapsed = duration(startedAt, finishedAt);
  if (elapsed) fields.push({ name: "Duration", value: elapsed, inline: true });

  const actor = githubPayload.pusher?.name || githubPayload.sender?.login;
  const author = actor ? { name: escapeMarkdown(actor), url: repository?.url } : undefined;
  const description = [
    `Branch: **${escapeMarkdown(targetBranch)}**`,
    `Commits: **${commits.length}**`,
  ].join("\n");

  return {
    title: `${succeeded ? "✅" : "❌"} Core deployment ${succeeded ? "succeeded" : "failed"}`,
    message: description,
    color: succeeded ? SUCCESS_COLOR : FAILURE_COLOR,
    fields,
    url: compareUrl ?? repository?.url,
    author,
    footer: { text: `Core deployment · ${runId ?? "unknown"}` },
    timestamp: finishedAt ?? startedAt,
  };
}
