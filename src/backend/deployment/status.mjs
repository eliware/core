export default function createDeploymentStatus(
  initial = { status: "idle", startedAt: null, finishedAt: null, steps: [] },
  onChange = () => {},
  readLatest = () => undefined,
) {
  let snapshot = structuredClone(initial);
  return {
    get() {
      const latest = readLatest();
      if (latest && latest.runId === snapshot.runId) snapshot = structuredClone(latest);
      return structuredClone(snapshot);
    },
    set(value) {
      snapshot = structuredClone(value);
      onChange(snapshot);
    },
    update(patch) {
      snapshot = { ...snapshot, ...structuredClone(patch) };
      onChange(snapshot);
    },
    timestamp(read, fallback) {
      try {
        return read();
      } catch {
        return fallback ?? null;
      }
    },
  };
}
