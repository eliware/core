export default function validateDiscordUrl(value) {
  if (!value) return value;
  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("DISCORD_WEBHOOK_URL must be a valid Discord webhook URL.");
  }
  if (
    parsedUrl.protocol !== "https:" ||
    !["discord.com", "discordapp.com"].includes(parsedUrl.hostname)
  ) {
    throw new Error("DISCORD_WEBHOOK_URL must use an HTTPS Discord hostname.");
  }
  return value;
}
