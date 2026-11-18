export default function createFailureStatus({
  error,
  event,
  runId,
  recovery,
  startedAt,
  steps,
  now,
}) {
  return {
    runId,
    event,
    status: "failed",
    failedStep: error?.stepName ?? "repository check",
    error: String(error?.message ?? error).slice(0, 300),
    recovery,
    startedAt,
    finishedAt: now().toISOString(),
    steps,
  };
}
