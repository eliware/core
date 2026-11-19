import { expect, jest, test } from "@jest/globals";
import startWebApplication from "../../src/backend/main.mjs";
import createShutdownHook from "../../src/backend/shutdown.mjs";

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
  const metricsMonitor = {
    start: jest.fn(),
    stop: jest.fn(),
    getStatus: jest.fn(() => ({ checkedAt: null, components: [] })),
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
    metricsMonitor,
    deployment,
    values: {
      loadConfig: jest.fn(() => configuration),
      createLogger: jest.fn(() => log),
      registerHandlers: jest.fn(),
      registerSignals: jest.fn((value) => Object.assign(signals, value)),
      createServer: jest.fn().mockReturnValueOnce(server).mockReturnValueOnce(webhookServer),
      registerWebRoutes: jest.fn(),
      registerStatusRoutes: jest.fn(),
      createShutdownHook: jest.fn(() => shutdown),
      createHealthMonitor: jest.fn(() => healthMonitor),
      createMetricsMonitor: jest.fn(() => metricsMonitor),
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
    expect(deps.values.registerStatusRoutes).toHaveBeenCalledWith(deps.server, {
      getHealthStatus: deps.healthMonitor.getStatus,
      getMetricsStatus: deps.metricsMonitor.getStatus,
      getDeploymentStatus: deps.deployment.getStatus,
      isReady: expect.any(Function),
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
      stopMetricsMonitor: deps.metricsMonitor.stop,
      isListening: expect.any(Function),
    });
    const isListening = deps.values.createShutdownHook.mock.calls[0][0].isListening;
    expect(isListening(deps.server)).toBe(true);
    expect(isListening(deps.webhookServer)).toBe(true);
    expect(deps.server.listen).toHaveBeenCalledWith({ port: tcpEndpoint, host: "127.0.0.1" });
    expect(deps.webhookServer.listen).toHaveBeenCalledWith({
      port: webhookEndpoint,
      host: "127.0.0.1",
    });
    expect(typeof deps.signals.shutdownHook).toBe("function");
    expect(deps.healthMonitor.start).toHaveBeenCalledTimes(1);
    expect(deps.metricsMonitor.start).toHaveBeenCalledTimes(1);
    const isReady = deps.values.registerStatusRoutes.mock.calls[0][1].isReady;
    expect(isReady()).toBe(true);
    await deps.signals.shutdownHook();
    expect(isReady()).toBe(false);
    expect(deps.shutdown).toHaveBeenCalledTimes(1);
  },
);

test("uses the configured log level", async () => {
  const deps = dependencies({ tcpEndpoint: 8081, webhookEndpoint: 9301, logLevel: "debug" });
  await startWebApplication(deps.values);
  expect(deps.values.createLogger).toHaveBeenCalledWith({ level: "debug" });
});

test("passes the configured Snowflake identity to deployment integrations", async () => {
  const snowflake = { workerId: 1, processId: 2 };
  const deps = dependencies({
    tcpEndpoint: 8081,
    webhookEndpoint: 9301,
    logLevel: "info",
    snowflake,
  });
  await startWebApplication(deps.values);
  expect(deps.values.createDeploymentManager).toHaveBeenCalledWith(
    expect.objectContaining({ snowflake }),
  );
});

test("disables webhook routes when the repository path lacks a secret", async () => {
  const deps = dependencies({
    tcpEndpoint: 8082,
    webhookEndpoint: 9303,
    logLevel: "info",
    repositoryPath: "/router/config",
  });
  await startWebApplication(deps.values);
  expect(deps.values.registerWebhookRoutes).toHaveBeenCalledWith(
    deps.webhookServer,
    expect.objectContaining({ enabled: false }),
  );
});

test("closes both listeners after startup fails", async () => {
  const deps = dependencies({ tcpEndpoint: 8083, webhookEndpoint: 9304, logLevel: "info" });
  deps.webhookServer.listen.mockRejectedValue(new Error("Port is in use"));
  deps.values.createShutdownHook.mockImplementation((options) => createShutdownHook(options));
  await expect(startWebApplication(deps.values)).rejects.toThrow("Port is in use");
  expect(deps.server.close).toHaveBeenCalledTimes(1);
  expect(deps.webhookServer.close).toHaveBeenCalledTimes(1);
  const isListening = deps.values.createShutdownHook.mock.calls[0][0].isListening;
  expect(isListening(deps.webhookServer)).toBe(true);
  expect(deps.healthMonitor.start).not.toHaveBeenCalled();
  expect(deps.values.registerStatusRoutes.mock.calls[0][1].isReady()).toBe(false);
});

test("closes a dashboard listener that opens before listen rejects", async () => {
  const deps = dependencies({ tcpEndpoint: 8084, webhookEndpoint: 9305, logLevel: "info" });
  const listenError = new Error("dashboard startup failed");
  deps.server.server = { listening: true };
  deps.server.listen.mockRejectedValue(listenError);
  deps.values.createShutdownHook.mockImplementation((options) => createShutdownHook(options));

  await expect(startWebApplication(deps.values)).rejects.toBe(listenError);
  expect(deps.server.close).toHaveBeenCalledTimes(1);
  expect(deps.webhookServer.close).not.toHaveBeenCalled();
});
