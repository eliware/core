export default async function reportSetupFailure({ error, event, runId, status, notify, now }) {
  const failure = String(error?.message ?? error).slice(0, 300);
  status.set({
    runId,
    event,
    status: "failed",
    error: failure,
    startedAt: status.get().startedAt,
    finishedAt: status.timestamp(() => now().toISOString(), status.get().startedAt),
    steps: status.get().steps,
  });
  try {
    await notify(`Core deployment ${runId} failed at deployment setup. ${failure}`);
  } catch {
    status.update({ notificationError: "Discord notification failed." });
  }
}
