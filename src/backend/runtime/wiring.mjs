import { resolve } from "node:path";
import { createLogger, registerHandlers, registerSignals } from "@eliware/common";
import registerWebRoutes from "../http.mjs";
import loadRuntimeConfig from "./config.mjs";
import createWebServer from "../server.mjs";
import createShutdownHook from "../shutdown.mjs";
import registerStatusRoutes from "../status-routes.mjs";
import createHealthMonitor from "../health-monitor.mjs";
import createMetricsMonitor from "../metrics-monitor.mjs";
import createDeploymentManager from "../deployment.mjs";
import sendDiscordNotification from "../discord-notifier.mjs";
import registerWebhookRoutes from "../webhook-routes.mjs";

export const runtimeDependencies = {
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
  createDeploymentManager,
  sendDiscordNotification,
  registerWebhookRoutes,
  resolve,
};
