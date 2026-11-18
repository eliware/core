import { expect, test } from "@jest/globals";
import validateDiscordUrl from "../../../src/backend/config/discord-url.mjs";

test("accepts absent and secure Discord webhook URLs", () => {
  expect(validateDiscordUrl(undefined)).toBeUndefined();
  expect(validateDiscordUrl("https://discord.com/api/webhooks/123/token")).toContain("discord.com");
  expect(validateDiscordUrl("https://discordapp.com/api/webhooks/123/token")).toContain(
    "discordapp.com",
  );
});

test.each(["invalid", "http://discord.com/webhook", "https://example.com/webhook"])(
  "rejects invalid Discord URL %s",
  (url) => {
    expect(() => validateDiscordUrl(url)).toThrow("Discord");
  },
);

test.each([
  "https://discord.com/",
  "https://discord.com/channels/123/456",
  "https://user:pass@discord.com/api/webhooks/123/token",
])("rejects a Discord URL that is not a webhook endpoint: %s", (url) => {
  expect(() => validateDiscordUrl(url)).toThrow("Discord");
});
