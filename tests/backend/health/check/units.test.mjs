import { expect, jest, test } from "@jest/globals";
import checkHealthUnits from "../../../../src/backend/health/check/units.mjs";

test("checks an empty unit list without starting workers", async () => {
  const checkUnit = jest.fn();
  await expect(checkHealthUnits({ units: [], checks: [], checkUnit })).resolves.toEqual([]);
  expect(checkUnit).not.toHaveBeenCalled();
});

test("limits concurrent systemd unit checks", async () => {
  let active = 0;
  let maximumActive = 0;
  const units = Array.from({ length: 10 }, (_value, index) => `unit-${index}.service`);
  const checks = units.map((name) => ({ name }));
  await checkHealthUnits({
    units,
    checks,
    now: () => new Date("2026-11-19T12:00:00.000Z"),
    checkUnit: async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
    },
  });
  expect(maximumActive).toBe(4);
});
