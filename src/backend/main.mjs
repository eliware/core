export default async function startWebApplication(dependencies) {
  const {
    tcpEndpoint,
    webhookEndpoint,
    logLevel,
    repositoryPath,
    githubWebhookSecret,
    discordWebhookUrl,
    githubBranch,
    healthUnits,
  } = dependencies.loadConfig();
  const log = dependencies.createLogger({ level: logLevel });
  const notify = (message) =>
    dependencies.sendDiscordNotification({
      webhookUrl: discordWebhookUrl,
      message,
    });
  const healthMonitor = dependencies.createHealthMonitor({
    units: healthUnits,
    onUnhealthy: ({ name, detail }) =>
      notify(`Core health check failed for ${name}: ${detail}.`).catch(() =>
        log.warn(`Discord notification failed for health check ${name}`),
      ),
  });
  const deployment = dependencies.createDeploymentManager({
    repositoryPath,
    branch: githubBranch,
    notify,
  });
  dependencies.registerHandlers({ log });
  const server = dependencies.createServer();
  const webhookServer = dependencies.createServer();
  dependencies.registerWebRoutes(server, {
    publicRoot: dependencies.resolve("public"),
    buildRoot: dependencies.resolve("dist"),
  });
  dependencies.registerApiExampleRoutes(server);
  dependencies.registerWebhookRoutes(webhookServer, {
    secret: githubWebhookSecret,
    branch: githubBranch,
    enabled: Boolean(repositoryPath),
    deployment,
  });
  dependencies.registerStatusRoutes(server, {
    getHealthStatus: healthMonitor.getStatus,
    getDeploymentStatus: deployment.getStatus,
  });
  const shutdownHook = dependencies.createShutdownHook({
    server,
    webhookServer,
    log,
    stopHealthMonitor: healthMonitor.stop,
  });
  dependencies.registerSignals({ log, shutdownHook });
  try {
    await server.listen({ port: tcpEndpoint, host: "0.0.0.0" });
    await webhookServer.listen({ port: webhookEndpoint, host: "0.0.0.0" });
    healthMonitor.start();
  } catch (error) {
    await shutdownHook();
    throw error;
  }
  log.info(`Dashboard accepts connections on TCP endpoint ${tcpEndpoint}`);
  log.info(`Webhook listener accepts connections on TCP endpoint ${webhookEndpoint}`);
  return server;
}
