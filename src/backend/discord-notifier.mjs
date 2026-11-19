import createDiscordPayload from "./discord/payload.mjs";

export default async function sendDiscordNotification({
  webhookUrl,
  message,
  title = "Core router update",
  color = 0x2563eb,
  fields = [],
  url,
  author,
  footer,
  timestamp,
  fetcher = fetch,
  now = () => new Date(),
}) {
  if (!webhookUrl) return false;
  const response = await fetcher(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      createDiscordPayload({ message, title, color, fields, url, author, footer, timestamp, now }),
    ),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Discord notification failed with HTTP ${response.status}.`);
  return true;
}
