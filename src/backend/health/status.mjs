export default function createHealthStatus(checks) {
  const status =
    checks.length === 0
      ? "unconfigured"
      : checks.some((item) => item.status === "unhealthy")
        ? "unhealthy"
        : checks.every((item) => item.status === "healthy")
          ? "healthy"
          : "unknown";
  return {
    status,
    checkedAt: checks.reduce(
      (latest, item) =>
        item.checkedAt && (!latest || item.checkedAt > latest) ? item.checkedAt : latest,
      null,
    ),
    units: checks,
  };
}
