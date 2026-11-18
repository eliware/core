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
      isListening: expect.any(Function),
    });
    const isListening = deps.values.createShutdownHook.mock.calls[0][0].isListening;
    expect(isListening(deps.server)).toBe(true);
    expect(isListening(deps.webhookServer)).toBe(true);
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

test("closes both listeners after startup fails", async () => {
  const deps = dependencies({ tcpEndpoint: 8083, webhookEndpoint: 9304, logLevel: "info" });
  deps.webhookServer.listen.mockRejectedValue(new Error("Port is in use"));
  await expect(startWebApplication(deps.values)).rejects.toThrow("Port is in use");
  expect(deps.shutdown).toHaveBeenCalledTimes(1);
  expect(deps.healthMonitor.start).not.toHaveBeenCalled();
});
