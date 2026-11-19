import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import createPersistedStatus from "../src/backend/deployment/persisted-status.mjs";
import checkCoreReadiness from "../src/backend/deployment/core/readiness.mjs";
import runRestartWorker from "../src/backend/deployment/restart-worker.mjs";
import loadEnvironment from "../src/backend/environment-loader.mjs";
import sendDiscordNotification from "../src/backend/discord-notifier.mjs";

const execFile = promisify(nodeExecFile);
const payload = JSON.parse(Buffer.from(process.argv[2], "base64url").toString("utf8"));
loadEnvironment();
const run = (command, args, options) => execFile(command, args, options);
const checkReady = (port, serviceUnit) =>
  checkCoreReadiness({
    port,
    serviceUnit,
    run,
    fetcher: (url) => fetch(url, { signal: AbortSignal.timeout(3000) }),
    pause: () => delay(1000),
    now: Date.now,
    timeoutMs: 90_000,
  });
await runRestartWorker(payload, {
  run,
  checkReady,
  notify: (notification) =>
    sendDiscordNotification({
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
      ...notification,
    }),
  saveStatus: createPersistedStatus(payload.repositoryPath).save,
});
