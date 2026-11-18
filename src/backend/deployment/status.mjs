export default function createDeploymentStatus(initial = {}) {
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
  };
}
