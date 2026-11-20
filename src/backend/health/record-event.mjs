export default function createUnitEventUpdate(checks, event) {
  const index = checks.findIndex(({ name }) => name === event.name);
  if (index < 0) return undefined;
  const previous = checks[index];
  const status =
    event.status === "unknown" && previous.status === "unhealthy" ? previous.status : event.status;
  const result = {
    ...previous,
    status,
    checkedAt: event.checkedAt,
    state: event.state,
    detail: event.detail,
  };
  const shouldNotify =
    (["failed", "stopped"].includes(event.event) && previous.status !== "unhealthy") ||
    event.event === "restarted";
  return {
    result,
    checks: checks.map((item, itemIndex) => (itemIndex === index ? result : item)),
    shouldNotify,
  };
}
