import { expect, jest, test } from "@jest/globals";
import sendDiscordNotification from "../../src/backend/discord-notifier.mjs";

test("sends a rich Discord embed", async () => {
  const fetcher = jest.fn().mockResolvedValue({ ok: true });
  const now = () => new Date("2026-11-18T12:00:00.000Z");
  await expect(
    sendDiscordNotification({
      webhookUrl: "https://discord.com/webhook",
      title: "Deployment passed",
      message: "The router updated.",
      color: 0x00ff00,
      fields: [{ name: "Router", value: "core1", inline: true }],
      fetcher,
      now,
    }),
  ).resolves.toBe(true);
  expect(fetcher).toHaveBeenCalledWith(
    "https://discord.com/webhook",
    expect.objectContaining({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "Deployment passed",
            description: "The router updated.",
            color: 0x00ff00,
            timestamp: now().toISOString(),
            fields: [{ name: "Router", value: "core1", inline: true }],
          },
        ],
      }),
      signal: expect.any(AbortSignal),
    }),
  );
});

test("skips notifications when the webhook URL is absent", async () => {
  const fetcher = jest.fn();
  await expect(sendDiscordNotification({ message: "Update", fetcher })).resolves.toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
});

test("reports Discord HTTP failures", async () => {
  await expect(
    sendDiscordNotification({
      webhookUrl: "https://discord.com/webhook",
      message: "Update",
      fetcher: async () => ({ ok: false, status: 500 }),
    }),
  ).rejects.toThrow("HTTP 500");
});

test("uses default embed values and limits Discord fields", async () => {
  jest.useFakeTimers({ now: new Date("2026-11-18T12:00:00.000Z") });
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true });
  const fields = Array.from({ length: 26 }, (_, index) => ({
    name: `Field ${index}`,
    value: "x".repeat(1100),
  }));
  await sendDiscordNotification({
    webhookUrl: "https://discord.com/webhook",
    message: "Deployment complete",
    fields,
  });
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.embeds[0].title).toBe("Core router update");
  expect(body.embeds[0].color).toBe(0x2563eb);
  expect(body.embeds[0].fields).toHaveLength(25);
  expect(body.embeds[0].fields[0]).toEqual({
    name: "Field 0",
    value: "x".repeat(1024),
    inline: false,
  });
  expect(body.embeds[0].timestamp).toBe("2026-11-18T12:00:00.000Z");
  fetcher.mockRestore();
  jest.useRealTimers();
});
