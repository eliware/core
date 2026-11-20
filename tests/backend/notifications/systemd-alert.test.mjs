import { expect, jest, test } from "@jest/globals";
import createSystemdAlert from "../../../src/backend/notifications/systemd-alert.mjs";

test("builds a red component failure embed with catalog details", async () => {
  const notify = jest.fn();
  const alert = createSystemdAlert({
    notify,
    components: [{ name: "DNS", health: { unit: "named.service" } }],
    dashboardUrl: "https://router.example/",
  });

  await alert({
    name: "named.service",
    event: "failed",
    status: "unhealthy",
    checkedAt: "2026-11-20T12:00:00.000Z",
    result: { detail: "Unit is not active" },
  });

  expect(notify).toHaveBeenCalledWith({
    title: "❌ Core component failure",
    message: "A systemd component changed state.",
    color: 0xed4245,
    url: "https://router.example/",
    timestamp: "2026-11-20T12:00:00.000Z",
    fields: [
      { name: "Component", value: "DNS", inline: true },
      { name: "Unit", value: "named.service", inline: true },
      { name: "Event", value: "failed", inline: true },
      { name: "Event time", value: "2026-11-20T12:00:00.000Z" },
      { name: "Current state", value: "Unit is not active" },
      { name: "Dashboard", value: "[Open dashboard](https://router.example/)" },
    ],
  });
});

test("builds a green restart embed and uses event state", () => {
  const notify = jest.fn();
  const alert = createSystemdAlert({ notify, components: [], dashboardUrl: "http://localhost/" });

  alert({
    name: "frr.service",
    event: "restarted",
    state: "active (running)",
    checkedAt: "2026-11-20T12:00:00.000Z",
  });

  expect(notify).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "🔄 Core component restarted",
      color: 0x57f287,
      fields: expect.arrayContaining([
        { name: "Component", value: "frr.service", inline: true },
        { name: "Current state", value: "active (running)" },
      ]),
    }),
  );
});

test("builds a yellow stopped embed with fallback event fields", () => {
  const notify = jest.fn();
  const alert = createSystemdAlert({ notify, components: [], dashboardUrl: "http://localhost/" });

  alert({ name: "frr.service", event: "stopped", result: {} });

  expect(notify).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "⚠️ Core component stopped",
      color: 0xfee75c,
      timestamp: undefined,
      fields: expect.arrayContaining([
        { name: "Event time", value: "Unknown" },
        { name: "Current state", value: "Unknown" },
      ]),
    }),
  );
});

test("marks unhealthy events as failures and uses result details", () => {
  const notify = jest.fn();
  const alert = createSystemdAlert({ notify, components: [], dashboardUrl: "http://localhost/" });

  alert({ name: "frr.service", event: "stopped", status: "unhealthy", result: { detail: "down" } });

  expect(notify).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "❌ Core component failure",
      color: 0xed4245,
      fields: expect.arrayContaining([{ name: "Current state", value: "down" }]),
    }),
  );
});
