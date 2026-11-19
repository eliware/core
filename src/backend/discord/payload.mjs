export default function createDiscordPayload({
  message,
  title = "Core router update",
  color = 0x2563eb,
  fields = [],
  url,
  author,
  footer,
  timestamp,
  now = () => new Date(),
}) {
  const embed = {
    title: title.slice(0, 256),
    description: message.slice(0, 4000),
    color,
    timestamp: timestamp ?? now().toISOString(),
    fields: fields.slice(0, 25).map(({ name, value, inline = false }) => ({
      name: String(name).slice(0, 256),
      value: String(value).slice(0, 1024),
      inline,
    })),
  };
  if (url) embed.url = url;
  if (author?.name) embed.author = { name: String(author.name).slice(0, 256), url: author.url };
  if (footer?.text) embed.footer = { text: String(footer.text).slice(0, 2048) };
  return {
    embeds: [embed],
    allowed_mentions: { parse: [] },
  };
}
