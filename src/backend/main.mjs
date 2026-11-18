import createApplicationIntegrations from "./main-integrations.mjs";

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
  const { healthMonitor, deployment } = createApplicationIntegrations(
    { repositoryPath, githubWebhookSecret, discordWebhookUrl, githubBranch, healthUnits },
    dependencies,
    log,
  );
  dependencies.registerHandlers({ log });
  const server = dependencies.createServer();
  const webhookServer = dependencies.createServer();
  const openServers = new Set();
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
    isListening: (item) => openServers.has(item),
  });
  dependencies.registerSignals({ log, shutdownHook });
  try {
    await server.listen({ port: tcpEndpoint, host: "0.0.0.0" });
    openServers.add(server);
    openServers.add(webhookServer);
    await webhookServer.listen({ port: webhookEndpoint, host: "127.0.0.1" });
    healthMonitor.start();
  } catch (error) {
    await shutdownHook();
    throw error;
  }
  log.info(`Dashboard accepts connections on TCP endpoint ${tcpEndpoint}`);
  log.info(`Webhook listener accepts connections on TCP endpoint ${webhookEndpoint}`);
  return server;
}
