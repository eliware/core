export default function createApplicationIntegrations(configuration, dependencies, log) {
  const catalogHealthUnits =
    configuration.catalog?.components.map(({ health }) => health.unit) ?? [];
  const healthUnits = [...new Set([...catalogHealthUnits, ...(configuration.healthUnits ?? [])])];
  const notify = (notification) =>
    dependencies.sendDiscordNotification({
      webhookUrl: configuration.discordWebhookUrl,
      ...(typeof notification === "string" ? { message: notification } : notification),
    });
  const componentNames = new Map(
    (configuration.catalog?.components ?? []).map(({ name, health }) => [health.unit, name]),
  );
  const dashboardUrl =
    configuration.dashboardUrl ?? `http://127.0.0.1:${configuration.tcpEndpoint}/`;
  const sendSystemdAlert = (event) => {
    const failed = event.event === "failed" || event.status === "unhealthy";
    const title =
      event.event === "restarted"
        ? "🔄 Core component restarted"
        : failed
          ? "❌ Core component failure"
          : "⚠️ Core component stopped";
    return notify({
      title,
      message: "A systemd component changed state.",
      color: failed ? 0xed4245 : event.event === "restarted" ? 0x57f287 : 0xfee75c,
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
  const healthMonitor = dependencies.createHealthMonitor({
    units: healthUnits,
    onUnhealthy: ({ name, detail, checkedAt }) =>
      sendSystemdAlert({
        name,
        event: "failed",
        status: "unhealthy",
        state: detail ?? "inactive",
        checkedAt,
      }).catch(() => log.warn(`Discord notification failed for health check ${name}`)),
    onSystemdEvent: (event) =>
      sendSystemdAlert(event).catch(() =>
        log.warn(`Discord notification failed for systemd event ${event.name}`),
      ),
  });
  const metricsMonitor = dependencies.createMetricsMonitor({ catalog: configuration.catalog });
  const systemdEventMonitor = dependencies.createSystemdEventMonitor({
    units: healthUnits,
    log,
    onEvent: async (event) => {
      const state = await dependencies.readSystemdUnitState(event.name);
      await healthMonitor.recordEvent({ ...event, ...state });
    },
  });
  const deployment = dependencies.createDeploymentManager({
    repositoryPath: configuration.repositoryPath,
    branch: configuration.githubBranch,
    snowflake: configuration.snowflake,
    dashboardPort: configuration.tcpEndpoint,
    notify,
  });
  return { healthMonitor, metricsMonitor, systemdEventMonitor, deployment };
}
