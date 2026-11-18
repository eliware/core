import { expect, test } from "@jest/globals";
import mapApplicationConfig from "../../../src/backend/config/application.mjs";

test("maps configured environment values", () => {
  expect(
    mapApplicationConfig({
      PORT: "8080",
      WEBHOOK_PORT: "8081",
      LOG_LEVEL: "debug",
      CORE_REPO_PATH: "/router/config",
      GITHUB_WEBHOOK_SECRET: "secret",
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token",
      CORE_GITHUB_BRANCH: "production",
      CORE_HEALTH_UNITS: "named.service",
      SNOWFLAKE_WORKER_ID: "7",
      SNOWFLAKE_PROCESS_ID: "11",
    }),
  ).toEqual({
    port: "8080",
    webhookPort: "8081",
    logLevel: "debug",
    repositoryPath: "/router/config",
    githubWebhookSecret: "secret",
    discordWebhookUrl: "https://discord.com/api/webhooks/123/token",
    githubBranch: "production",
    healthUnits: "named.service",
    workerId: "7",
    processId: "11",
  });
});

test("maps optional values to their defaults", () => {
  expect(mapApplicationConfig({})).toEqual({
    port: undefined,
    webhookPort: "9301",
    logLevel: "info",
    repositoryPath: undefined,
    githubWebhookSecret: undefined,
    discordWebhookUrl: undefined,
    githubBranch: undefined,
    healthUnits: undefined,
    workerId: undefined,
    processId: undefined,
  });
});
