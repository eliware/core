export default function createApplicationIntegrations(configuration, dependencies, log) {
  const healthUnits = configuration.catalog
    ? [...new Set(configuration.catalog.components.map(({ health }) => health.unit))]
    : configuration.healthUnits;
  const notify = (notification) =>
    dependencies.sendDiscordNotification({
      webhookUrl: configuration.discordWebhookUrl,
      ...(typeof notification === "string" ? { message: notification } : notification),
    });
  const healthMonitor = dependencies.createHealthMonitor({
    units: healthUnits,
    onUnhealthy: ({ name, detail }) =>
      notify(`Core health check failed for ${name}: ${detail}.`).catch(() =>
        log.warn(`Discord notification failed for health check ${name}`),
      ),
  });
  const metricsMonitor = dependencies.createMetricsMonitor({ catalog: configuration.catalog });
  const deployment = dependencies.createDeploymentManager({
    repositoryPath: configuration.repositoryPath,
    branch: configuration.githubBranch,
    snowflake: configuration.snowflake,
    dashboardPort: configuration.tcpEndpoint,
    notify,
  });
  return { healthMonitor, metricsMonitor, deployment };
}
