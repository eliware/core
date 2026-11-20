import createSystemdAlert from "./notifications/systemd-alert.mjs";
import createSystemdEventHandler from "./systemd/event-state.mjs";

export default function createApplicationIntegrations(configuration, dependencies, log) {
  const catalogHealthUnits =
    configuration.catalog?.components.map(({ health }) => health.unit) ?? [];
  const healthUnits = [...new Set([...catalogHealthUnits, ...(configuration.healthUnits ?? [])])];
  const notify = (notification) =>
    dependencies.sendDiscordNotification({
      webhookUrl: configuration.discordWebhookUrl,
      ...(typeof notification === "string" ? { message: notification } : notification),
    });
  const dashboardUrl =
    configuration.dashboardUrl ?? `http://127.0.0.1:${configuration.tcpEndpoint}/`;
  const sendSystemdAlert = createSystemdAlert({
    notify,
    components: configuration.catalog?.components ?? [],
    dashboardUrl,
  });
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
    onEvent: createSystemdEventHandler({
      readUnitState: dependencies.readSystemdUnitState,
      recordEvent: healthMonitor.recordEvent,
    }),
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
