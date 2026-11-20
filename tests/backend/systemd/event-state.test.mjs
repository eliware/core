import { expect, jest, test } from "@jest/globals";
import createHealthMonitor from "../../../src/backend/health-monitor.mjs";
import createSystemdEventHandler from "../../../src/backend/systemd/event-state.mjs";

test("loads unit state and records the complete systemd event", async () => {
  const readUnitState = jest.fn().mockResolvedValue({ status: "healthy", state: "active" });
  const recordEvent = jest.fn();
  const handle = createSystemdEventHandler({ readUnitState, recordEvent });
  const event = { name: "named.service", event: "restarted", checkedAt: "2026-11-20T12:00:00Z" };

  await handle(event);

  expect(readUnitState).toHaveBeenCalledWith("named.service");
  expect(recordEvent).toHaveBeenCalledWith({
    ...event,
    status: "healthy",
    state: "active",
  });
});
test("propagates unit state read failures", async () => {
  const failure = new Error("systemd unavailable");
  const readUnitState = jest.fn().mockRejectedValue(failure);
  const recordEvent = jest.fn();
  const handle = createSystemdEventHandler({ readUnitState, recordEvent });

  await expect(handle({ name: "named.service" })).rejects.toBe(failure);
  expect(recordEvent).not.toHaveBeenCalled();
});

test.each(["failed", "stopped"])(
  "keeps %s events unhealthy when the unit has restarted",
  async (eventType) => {
    const readUnitState = jest.fn().mockResolvedValue({ status: "healthy", state: "active" });
    const recordEvent = jest.fn();
    const handle = createSystemdEventHandler({ readUnitState, recordEvent });

    await handle({ name: "named.service", event: eventType });

    expect(recordEvent).toHaveBeenCalledWith({
      name: "named.service",
      event: eventType,
      status: "unhealthy",
      state: "active",
    });
  },
);

test("records and notifies a failure before reporting the unit restart", async () => {
  const onSystemdEvent = jest.fn();
  const monitor = createHealthMonitor({
    units: ["named.service"],
    checkUnit: jest.fn().mockResolvedValue(undefined),
    onSystemdEvent,
    setIntervalFn: () => 1,
  });
  const handle = createSystemdEventHandler({
    readUnitState: jest.fn().mockResolvedValue({ status: "healthy", state: "active" }),
    recordEvent: monitor.recordEvent,
  });
  monitor.start();
  await monitor.check();
  await handle({ name: "named.service", event: "failed" });
  expect(monitor.getStatus().units[0].status).toBe("unhealthy");
  await handle({ name: "named.service", event: "restarted" });
  expect(monitor.getStatus().units[0].status).toBe("healthy");
  expect(onSystemdEvent.mock.calls.map(([event]) => event.event)).toEqual(["failed", "restarted"]);
  await monitor.stop();
});
