export default function createSystemdAlert({ notify, components, dashboardUrl }) {
  const componentNames = new Map(components.map(({ name, health }) => [health.unit, name]));
  return function sendSystemdAlert(event) {
    const failed = event.event === "failed" || event.status === "unhealthy";
    const title =
      event.event === "restarted"
        ? "🔄 Core component restarted"
        : failed
          ? "❌ Core component failure"
          : "⚠️ Core component stopped";
    const color = failed ? 0xed4245 : event.event === "restarted" ? 0x57f287 : 0xfee75c;
    return notify({
      title,
      message: "A systemd component changed state.",
      color,
      url: dashboardUrl,
      timestamp: event.checkedAt,
      fields: [
        { name: "Component", value: componentNames.get(event.name) ?? event.name, inline: true },
        { name: "Unit", value: event.name, inline: true },
        { name: "Event", value: event.event, inline: true },
        { name: "Event time", value: event.checkedAt ?? "Unknown" },
        { name: "Current state", value: event.state ?? event.result?.detail ?? "Unknown" },
        { name: "Dashboard", value: `[Open dashboard](${dashboardUrl})` },
      ],
    });
  };
}
