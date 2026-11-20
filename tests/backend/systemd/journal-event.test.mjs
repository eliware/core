import { expect, jest, test } from "@jest/globals";
import parseJournalEvent from "../../../src/backend/systemd/journal-event.mjs";

test("parses failure, stop, and start journal entries for monitored units", () => {
  const units = ["named.service"];
  expect(
    parseJournalEvent(
      JSON.stringify({
        UNIT: units[0],
        MESSAGE: "named.service: Main process exited",
        __REALTIME_TIMESTAMP: "1795093200000000",
      }),
      units,
    ),
  ).toMatchObject({ name: units[0], event: "failed", checkedAt: "2026-11-19T13:00:00.000Z" });
  expect(
    parseJournalEvent(
      JSON.stringify({ OBJECT_SYSTEMD_UNIT: units[0], MESSAGE: "Stopped Name Server." }),
      units,
    ),
  ).toMatchObject({ event: "stopped" });
  expect(
    parseJournalEvent(
      JSON.stringify({ _SYSTEMD_UNIT: units[0], MESSAGE: "Started Name Server." }),
      units,
    ),
  ).toMatchObject({ event: "started" });
  expect(
    parseJournalEvent(
      JSON.stringify({ UNIT: [units[0]], MESSAGE: "Failed to start Name Server." }),
      units,
    ),
  ).toMatchObject({ event: "failed" });
});

test("ignores malformed and unrelated journal entries and uses a fallback event time", () => {
  const now = () => new Date("2026-11-19T12:00:00.000Z");
  expect(parseJournalEvent("invalid", ["named.service"], now)).toBeNull();
  expect(parseJournalEvent("null", ["named.service"], now)).toBeNull();
  expect(
    parseJournalEvent(JSON.stringify({ UNIT: "named.service" }), ["named.service"], now),
  ).toBeNull();
  expect(
    parseJournalEvent(JSON.stringify({ MESSAGE: "Started sshd.service" }), ["named.service"], now),
  ).toBeNull();
  expect(
    parseJournalEvent(
      JSON.stringify({ UNIT: "named.service", MESSAGE: "Routine service output" }),
      ["named.service"],
      now,
    ),
  ).toBeNull();
  expect(
    parseJournalEvent(
      JSON.stringify({ UNIT: "named.service", MESSAGE: "Stopped Name Server." }),
      ["named.service"],
      now,
    ),
  ).toMatchObject({ checkedAt: now().toISOString() });
  expect(
    parseJournalEvent(
      JSON.stringify({ MESSAGE: "A backup for named.service stopped unexpectedly." }),
      ["named.service"],
      now,
    ),
  ).toBeNull();
  expect(
    parseJournalEvent(
      JSON.stringify({ UNIT: "named.service", MESSAGE: "Stopped Name Server." }),
      ["named.service"],
      jest
        .fn()
        .mockReturnValueOnce(new Date(Number.NaN))
        .mockReturnValue(new Date("2026-11-19T12:00:00.000Z")),
    ),
  ).toMatchObject({ checkedAt: "2026-11-19T12:00:00.000Z" });
});
