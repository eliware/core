export default function createDeploymentStatus(
  initial = { status: "idle", startedAt: null, finishedAt: null, steps: [] },
) {
  let snapshot = structuredClone(initial);
  return {
    get() {
      return structuredClone(snapshot);
    },
    set(value) {
      snapshot = structuredClone(value);
    },
    update(patch) {
      snapshot = { ...snapshot, ...structuredClone(patch) };
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
