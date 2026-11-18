export default function createApplicationIntegrations(configuration, dependencies, log) {
  const notify = (message) =>
    dependencies.sendDiscordNotification({
      webhookUrl: configuration.discordWebhookUrl,
      message,
    });
  const healthMonitor = dependencies.createHealthMonitor({
    units: configuration.healthUnits,
    onUnhealthy: ({ name, detail }) =>
      notify(`Core health check failed for ${name}: ${detail}.`).catch(() =>
        log.warn(`Discord notification failed for health check ${name}`),
      ),
  });
  const deployment = dependencies.createDeploymentManager({
    repositoryPath: configuration.repositoryPath,
    branch: configuration.githubBranch,
    snowflake: configuration.snowflake,
    notify,
  });
  return { healthMonitor, deployment };
}
