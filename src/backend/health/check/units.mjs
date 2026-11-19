import checkHealthUnit from "./unit.mjs";

const maxConcurrentUnitChecks = 4;

export default async function checkHealthUnits({ units, checks, checkUnit, now }) {
  const results = Array.from({ length: units.length });
  let nextIndex = 0;
  async function runNext() {
    while (nextIndex < units.length) {
      const index = nextIndex;
      nextIndex += 1;
      const name = checks[index].name;
      try {
        results[index] = await checkHealthUnit(units[index], checkUnit, now);
      } catch {
        results[index] = {
          name,
          status: "unknown",
          checkedAt: null,
          detail: "Health check could not start",
        };
      }
    }
  }
  const workers = Array.from({ length: Math.min(units.length, maxConcurrentUnitChecks) }, () =>
    runNext(),
  );
  await Promise.all(workers);
  return results;
}
