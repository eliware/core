import { expect, jest, test } from "@jest/globals";
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
