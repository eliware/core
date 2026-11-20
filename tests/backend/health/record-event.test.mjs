import { expect, jest, test } from "@jest/globals";
import * as healthMonitorHelpers from "../../../test-fixtures/health-monitor.mjs";
const { createHealthMonitor } = healthMonitorHelpers;
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

test("keeps an unhealthy state when a started event has unknown live state", () => {
  const unhealthy = { ...unit, status: "unhealthy" };
  const started = createUnitEventUpdate([unhealthy], {
    ...event,
    event: "started",
    status: "unknown",
    state: "unknown",
  });
  expect(started.result.status).toBe("unhealthy");
  expect(createUnitEventUpdate(started.checks, { ...event, event: "failed" }).shouldNotify).toBe(
    false,
  );
});

test("allows a systemd event callback to stop during a replacement health check", async () => {
  const checkCompletions = [];
  const checkUnit = jest.fn(() => new Promise((resolve) => checkCompletions.push(resolve)));
  let monitor;
  const onSystemdEvent = jest.fn(async () => monitor.stop());
  monitor = createHealthMonitor({
    units: ["frr.service"],
    checkUnit,
    onSystemdEvent,
    setIntervalFn: () => 1,
  });
  monitor.start();
  const firstStop = monitor.stop();
  monitor.start();
  const recorded = monitor.recordEvent(healthMonitorHelpers.systemdFailureEvent);
  checkCompletions[0]();
  await recorded;
  await firstStop;
  expect(onSystemdEvent).toHaveBeenCalledTimes(1);
  expect(checkCompletions).toHaveLength(2);
  checkCompletions[1]();
  await monitor.stop();
});
