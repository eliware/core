function fieldUnits(entry) {
  return [entry.UNIT, entry.OBJECT_SYSTEMD_UNIT, entry._SYSTEMD_UNIT].flatMap((value) =>
    Array.isArray(value) ? value : value ? [value] : [],
  );
}

export default function parseJournalEvent(source, units, now = () => new Date()) {
  let entry;
  try {
    entry = JSON.parse(source);
  } catch {
    return null;
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const message = typeof entry.MESSAGE === "string" ? entry.MESSAGE : "";
  const entryUnits = fieldUnits(entry);
  const unit = units.find(
    (candidate) => entryUnits.includes(candidate) || message.startsWith(`${candidate}:`),
  );
  if (!unit) return null;
  const event =
    /(?:Failed to start|Main process exited|Failed with result|Scheduled restart job)/iu.test(
      message,
    )
      ? "failed"
      : /^(?:Stopping|Stopped)\b/iu.test(message)
        ? "stopped"
        : /^(?:Starting|Started)\b/iu.test(message)
          ? "started"
          : null;
  if (!event) return null;
  const timestamp = Number(entry.__REALTIME_TIMESTAMP);
  const eventTime = Number.isFinite(timestamp) ? new Date(timestamp / 1000) : now();
  return {
    name: unit,
    event,
    checkedAt: Number.isNaN(eventTime.getTime()) ? now().toISOString() : eventTime.toISOString(),
    message,
  };
}
