import createDeploymentDiscordNotification from "./discord-notification.mjs";

export default async function reportSetupFailure({
  error,
  event,
  runId,
  githubPayload,
  branch,
  status,
  notify,
  now,
}) {
  const failure = String(error?.message ?? error).slice(0, 300);
  const current = status.get();
  const finishedAt = status.timestamp(() => now().toISOString(), current.startedAt);
  status.set({
    runId,
    event,
    status: "failed",
    error: failure,
    failedStep: "deployment setup",
    startedAt: current.startedAt,
    finishedAt,
    steps: current.steps,
  });
  try {
    await notify(
      createDeploymentDiscordNotification({
        ...status.get(),
        branch,
        githubPayload,
      }),
    );
  } catch {
    status.update({ notificationError: "Discord notification failed." });
  }
}
