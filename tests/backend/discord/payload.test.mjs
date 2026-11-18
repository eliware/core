import { expect, test } from "@jest/globals";
import createDiscordPayload from "../../../src/backend/discord/payload.mjs";

test("builds bounded embed payloads with defaults", () => {
  const payload = createDiscordPayload({
    message: "Ready",
    now: () => new Date("2026-11-18T12:00:00.000Z"),
    fields: [{ name: "Router", value: "core1" }],
  });
  expect(payload.embeds[0]).toEqual({
    title: "Core router update",
    description: "Ready",
    color: 0x2563eb,
    timestamp: "2026-11-18T12:00:00.000Z",
    fields: [{ name: "Router", value: "core1", inline: false }],
  });
});

test("limits embed text and field counts", () => {
  const payload = createDiscordPayload({
    title: "t".repeat(300),
    message: "m".repeat(5000),
    fields: Array.from({ length: 26 }, () => ({ name: "n".repeat(300), value: "v".repeat(1100) })),
  });
  expect(payload.embeds[0].title).toHaveLength(256);
  expect(payload.embeds[0].description).toHaveLength(4000);
  expect(payload.embeds[0].fields).toHaveLength(25);
  expect(payload.embeds[0].fields[0]).toEqual({
    name: "n".repeat(256),
    value: "v".repeat(1024),
    inline: false,
  });
});

test("uses the current time when the caller omits a clock", () => {
  expect(createDiscordPayload({ message: "Ready" }).embeds[0].timestamp).toEqual(
    expect.any(String),
  );
});
