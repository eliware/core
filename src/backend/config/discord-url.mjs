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
  )
    throw new Error("DISCORD_WEBHOOK_URL must use an HTTPS Discord hostname.");
  if (
    parsedUrl.port ||
    !/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/u.test(parsedUrl.pathname) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error("DISCORD_WEBHOOK_URL must use an HTTPS Discord webhook endpoint.");
  }
  return value;
}
