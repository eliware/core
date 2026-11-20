const SUCCESS_COLOR = 0x00ff00;
const FAILURE_COLOR = 0xff0000;
import escapeMarkdown from "./notification/escape.mjs";
import formatCommits from "./notification/commits.mjs";
import formatFileChanges from "./notification/files.mjs";
import formatSteps from "./notification/steps.mjs";
import resolveNotificationLinks from "./notification/links.mjs";

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
  const { repository, compareUrl } = resolveNotificationLinks(githubPayload);
  const ref =
    typeof githubPayload.ref === "string" ? githubPayload.ref.replace(/^refs\/heads\//u, "") : "";
  const targetBranch = ref || branch;
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
