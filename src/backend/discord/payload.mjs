export default function createDiscordPayload({
  message,
  title = "Core router update",
  color = 0x2563eb,
  fields = [],
  now = () => new Date(),
}) {
  return {
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
  };
}
