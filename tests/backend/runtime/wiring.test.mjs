import { expect, test } from "@jest/globals";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, registerHandlers, registerSignals } from "@eliware/common";
import registerWebRoutes from "../../../src/backend/http.mjs";
import loadRuntimeConfig from "../../../src/backend/runtime/config.mjs";
import { runtimeDependencies } from "../../../src/backend/runtime/wiring.mjs";
import createWebServer from "../../../src/backend/server.mjs";
import createShutdownHook from "../../../src/backend/shutdown.mjs";
import registerStatusRoutes from "../../../src/backend/status-routes.mjs";
import createHealthMonitor from "../../../src/backend/health-monitor.mjs";
import createMetricsMonitor from "../../../src/backend/metrics-monitor.mjs";
import createSystemdEventMonitor from "../../../src/backend/systemd-event-monitor.mjs";
import readSystemdUnitState from "../../../src/backend/systemd/read-unit-state.mjs";
import createDeploymentManager from "../../../src/backend/deployment.mjs";
import sendDiscordNotification from "../../../src/backend/discord-notifier.mjs";
import registerWebhookRoutes from "../../../src/backend/webhook-routes.mjs";

test("assembles the production application dependencies", () => {
  expect(runtimeDependencies).toEqual({
    loadConfig: loadRuntimeConfig,
    createLogger,
    registerHandlers,
    registerSignals,
    createServer: createWebServer,
    registerWebRoutes,
    createShutdownHook,
    registerStatusRoutes,
    createHealthMonitor,
    createMetricsMonitor,
    createSystemdEventMonitor,
    readSystemdUnitState,
    createDeploymentManager,
    sendDiscordNotification,
    registerWebhookRoutes,
    resolve: expect.any(Function),
  });
});

test("resolves web assets from the installed package directory", () => {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  expect(runtimeDependencies.resolve("public")).toBe(resolve(packageRoot, "public"));
  expect(runtimeDependencies.resolve("dist")).toBe(resolve(packageRoot, "dist"));
});

test("loads application configuration through the production dependency", () => {
  const originalPort = process.env.PORT;
  const originalLogLevel = process.env.LOG_LEVEL;
  const originalWorkerId = process.env.SNOWFLAKE_WORKER_ID;
  const originalProcessId = process.env.SNOWFLAKE_PROCESS_ID;
  process.env.PORT = "8080";
  process.env.LOG_LEVEL = "debug";
  process.env.SNOWFLAKE_WORKER_ID = "1";
  process.env.SNOWFLAKE_PROCESS_ID = "2";

  try {
    expect(runtimeDependencies.loadConfig()).toEqual({
      tcpEndpoint: 8080,
      webhookEndpoint: 9301,
      logLevel: "debug",
      repositoryPath: undefined,
      githubWebhookSecret: undefined,
      discordWebhookUrl: undefined,
      githubBranch: "main",
      healthUnits: [],
      catalog: null,
      dashboardUrl: "http://127.0.0.1:8080/",
      snowflake: { workerId: 1, processId: 2 },
    });
  } finally {
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
    if (originalLogLevel === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = originalLogLevel;
    if (originalWorkerId === undefined) delete process.env.SNOWFLAKE_WORKER_ID;
    else process.env.SNOWFLAKE_WORKER_ID = originalWorkerId;
    if (originalProcessId === undefined) delete process.env.SNOWFLAKE_PROCESS_ID;
    else process.env.SNOWFLAKE_PROCESS_ID = originalProcessId;
  }
});
