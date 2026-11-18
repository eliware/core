export default async function sendDiscordNotification({
  webhookUrl,
  message,
  title = "Core router update",
  color = 0x2563eb,
  fields = [],
  fetcher = fetch,
  now = () => new Date(),
}) {
  if (!webhookUrl) return false;
  const response = await fetcher(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: title.slice(0, 256),
          description: message.slice(0, 4000),
          color,
          timestamp: now().toISOString(),
          fields: fields.slice(0, 25).map(({ name, value, inline = false }) => ({
            name: String(name).slice(0, 256),
            value: String(value).slice(0, 1024),
            inline,
          })),
        },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Discord notification failed with HTTP ${response.status}.`);
  return true;
}
