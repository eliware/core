import { expect, jest, test } from "@jest/globals";
import startWebApplication from "../../src/backend/main.mjs";

function dependencies(
  configuration = { tcpEndpoint: 9300, webhookEndpoint: 9301, logLevel: "info" },
) {
  const server = {
    listen: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const webhookServer = {
    listen: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const log = { info: jest.fn(), warn: jest.fn() };
  const signals = {};
  const shutdown = jest.fn();
  const healthMonitor = {
    start: jest.fn(),
    stop: jest.fn(),
    getStatus: jest.fn(() => ({ status: "healthy", units: [] })),
  };
  const deployment = {
    start: jest.fn(),
    getStatus: jest.fn(() => ({ status: "idle", steps: [] })),
  };
  return {
    server,
    webhookServer,
    log,
    signals,
    shutdown,
    healthMonitor,
    deployment,
    values: {
      loadConfig: jest.fn(() => configuration),
      createLogger: jest.fn(() => log),
      registerHandlers: jest.fn(),
      registerSignals: jest.fn((value) => Object.assign(signals, value)),
      createServer: jest.fn().mockReturnValueOnce(server).mockReturnValueOnce(webhookServer),
      registerWebRoutes: jest.fn(),
      registerApiExampleRoutes: jest.fn(),
      registerStatusRoutes: jest.fn(),
      createShutdownHook: jest.fn(() => shutdown),
      createHealthMonitor: jest.fn(() => healthMonitor),
      createDeploymentManager: jest.fn(() => deployment),
      sendDiscordNotification: jest.fn().mockResolvedValue(true),
      registerWebhookRoutes: jest.fn(),
      resolve: jest.fn((path) => `/app/${path}`),
    },
  };
}

test.each([
  [9300, 9301],
  [8080, 9302],
])(
  "starts on configured dashboard and webhook ports %s and %s",
  async (tcpEndpoint, webhookEndpoint) => {
    const deps = dependencies({ tcpEndpoint, webhookEndpoint, logLevel: "info" });
    await expect(startWebApplication(deps.values)).resolves.toBe(deps.server);
    expect(deps.values.loadConfig).toHaveBeenCalledTimes(1);
    expect(deps.values.createServer).toHaveBeenCalledTimes(2);
    expect(deps.values.createServer.mock.calls[0]).toEqual([]);
    expect(deps.values.registerWebRoutes).toHaveBeenCalledWith(deps.server, {
      publicRoot: "/app/public",
      buildRoot: "/app/dist",
    });
    expect(deps.values.registerApiExampleRoutes).toHaveBeenCalledWith(deps.server);
    expect(deps.values.registerStatusRoutes).toHaveBeenCalledWith(deps.server, {
      getHealthStatus: deps.healthMonitor.getStatus,
      getDeploymentStatus: deps.deployment.getStatus,
    });
    expect(deps.values.registerWebhookRoutes).toHaveBeenCalledWith(deps.webhookServer, {
      secret: undefined,
      branch: undefined,
      enabled: false,
      deployment: deps.deployment,
    });
    expect(deps.values.createShutdownHook).toHaveBeenCalledWith({
      server: deps.server,
      webhookServer: deps.webhookServer,
      log: deps.log,
      stopHealthMonitor: deps.healthMonitor.stop,
    });
    expect(deps.server.listen).toHaveBeenCalledWith({ port: tcpEndpoint, host: "0.0.0.0" });
    expect(deps.webhookServer.listen).toHaveBeenCalledWith({
      port: webhookEndpoint,
      host: "0.0.0.0",
    });
    expect(typeof deps.signals.shutdownHook).toBe("function");
    expect(deps.healthMonitor.start).toHaveBeenCalledTimes(1);
    expect(deps.signals.shutdownHook).toBe(deps.shutdown);
  },
);

test("uses the configured log level", async () => {
  const deps = dependencies({ tcpEndpoint: 8081, webhookEndpoint: 9301, logLevel: "debug" });
  await startWebApplication(deps.values);
  expect(deps.values.createLogger).toHaveBeenCalledWith({ level: "debug" });
});

test("wires deployment, health checks, and Discord using runtime settings", async () => {
  const deps = dependencies({
    tcpEndpoint: 8082,
    webhookEndpoint: 9303,
    logLevel: "info",
    repositoryPath: "/etc/eliware/core1",
    githubWebhookSecret: "secret",
    discordWebhookUrl: "https://discord.com/webhook",
    githubBranch: "main",
    healthUnits: ["frr.service"],
  });
  await startWebApplication(deps.values);
  expect(deps.values.createHealthMonitor).toHaveBeenCalledWith({
    units: ["frr.service"],
    onUnhealthy: expect.any(Function),
  });
  const healthOptions = deps.values.createHealthMonitor.mock.calls[0][0];
  await healthOptions.onUnhealthy({ name: "frr.service", detail: "Unit is not active" });
  const deploymentOptions = deps.values.createDeploymentManager.mock.calls[0][0];
  await deploymentOptions.notify("Deployment message");
  expect(deps.values.sendDiscordNotification).toHaveBeenCalledWith({
    webhookUrl: "https://discord.com/webhook",
    message: "Deployment message",
  });
  expect(deps.values.createDeploymentManager).toHaveBeenCalledWith({
    repositoryPath: "/etc/eliware/core1",
    branch: "main",
    notify: expect.any(Function),
  });
  expect(deps.values.registerStatusRoutes).toHaveBeenCalledWith(deps.server, {
    getHealthStatus: deps.healthMonitor.getStatus,
    getDeploymentStatus: deps.deployment.getStatus,
  });
});

test("logs Discord notification failures and closes listeners after startup failure", async () => {
  const deps = dependencies({ tcpEndpoint: 8083, webhookEndpoint: 9304, logLevel: "info" });
  deps.values.sendDiscordNotification.mockRejectedValue(new Error("Discord is unavailable"));
  deps.webhookServer.listen.mockRejectedValue(new Error("Port is in use"));
  await expect(startWebApplication(deps.values)).rejects.toThrow("Port is in use");
  expect(deps.shutdown).toHaveBeenCalledTimes(1);
  expect(deps.healthMonitor.start).not.toHaveBeenCalled();
  const onUnhealthy = deps.values.createHealthMonitor.mock.calls[0][0].onUnhealthy;
  await onUnhealthy({ name: "frr.service", detail: "inactive" });
  expect(deps.log.warn).toHaveBeenCalledWith(
    "Discord notification failed for health check frr.service",
  );
});
