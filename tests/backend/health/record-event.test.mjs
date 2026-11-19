import { expect, test } from "@jest/globals";
import createUnitEventUpdate from "../../../src/backend/health/record-event.mjs";

const unit = { name: "frr.service", status: "healthy", checkedAt: null };
const event = {
  name: "frr.service",
  event: "failed",
  status: "unhealthy",
  state: "failed (Result: exit-code)",
  checkedAt: "2026-11-19T12:00:00.000Z",
};

test("ignores events for units outside the configured list", () => {
  expect(createUnitEventUpdate([unit], { ...event, name: "missing.service" })).toBeUndefined();
});

test("updates unit state and notifies once for a continuing failure", () => {
  const other = { name: "named.service", status: "healthy", checkedAt: null };
  const first = createUnitEventUpdate([unit, other], event);
  expect(first.result).toMatchObject({ status: "unhealthy", state: event.state });
  expect(first.checks).toEqual([first.result, other]);
  expect(first.shouldNotify).toBe(true);
  expect(createUnitEventUpdate(first.checks, event).shouldNotify).toBe(false);
});

test("notifies when a failed unit restarts", () => {
  const unhealthy = { ...unit, status: "unhealthy" };
  expect(
    createUnitEventUpdate([unhealthy], { ...event, event: "restarted", status: "healthy" }),
  ).toMatchObject({ shouldNotify: true, result: { status: "healthy" } });
});
