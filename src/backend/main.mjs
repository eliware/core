import createApplicationIntegrations from "./main-integrations.mjs";

export default async function startWebApplication(dependencies) {
  const {
    tcpEndpoint,
    dashboardUrl,
    webhookEndpoint,
    logLevel,
    repositoryPath,
    githubWebhookSecret,
    discordWebhookUrl,
    githubBranch,
    healthUnits,
    catalog,
    snowflake,
  } = dependencies.loadConfig();
  const log = dependencies.createLogger({ level: logLevel });
  const { healthMonitor, metricsMonitor, systemdEventMonitor, deployment } =
    createApplicationIntegrations(
      {
        repositoryPath,
        tcpEndpoint,
        dashboardUrl,
        githubWebhookSecret,
        discordWebhookUrl,
        githubBranch,
        healthUnits,
        catalog,
        snowflake,
      },
      dependencies,
      log,
    );
  let ready = false;
  dependencies.registerHandlers({ log });
  const server = dependencies.createServer();
  const webhookServer = dependencies.createServer();
  const openServers = new Set();
  dependencies.registerWebRoutes(server, {
    publicRoot: dependencies.resolve("public"),
    buildRoot: dependencies.resolve("dist"),
  });
  dependencies.registerWebhookRoutes(webhookServer, {
    secret: githubWebhookSecret,
    branch: githubBranch,
    enabled: Boolean(repositoryPath && githubWebhookSecret),
    deployment,
  });
  dependencies.registerStatusRoutes(server, {
    getHealthStatus: healthMonitor.getStatus,
    getMetricsStatus: metricsMonitor.getStatus,
    getDeploymentStatus: deployment.getStatus,
    isReady: () => ready,
  });
  const shutdownHook = dependencies.createShutdownHook({
    server,
    webhookServer,
    log,
    stopHealthMonitor: healthMonitor.stop,
    stopMetricsMonitor: metricsMonitor.stop,
    stopSystemdEventMonitor: systemdEventMonitor.stop,
    isListening: (item) => openServers.has(item),
  });
  const stopApplication = async () => {
    ready = false;
    return shutdownHook();
  };
  dependencies.registerSignals({ log, shutdownHook: stopApplication });
  try {
    openServers.add(server);
    await server.listen({ port: tcpEndpoint, host: "127.0.0.1" });
    openServers.add(webhookServer);
    await webhookServer.listen({ port: webhookEndpoint, host: "127.0.0.1" });
    healthMonitor.start();
    metricsMonitor.start();
    systemdEventMonitor.start();
    ready = true;
  } catch (error) {
    await shutdownHook();
    throw error;
  }
  log.info(`Dashboard accepts connections on TCP endpoint ${tcpEndpoint}`);
  log.info(`Webhook listener accepts connections on TCP endpoint ${webhookEndpoint}`);
  return server;
}
