import { expect, test } from "@jest/globals";
import loadApplicationConfig from "../../src/backend/config.mjs";

test.each([
  [
    "configured values",
    {
      PORT: "8080",
      LOG_LEVEL: "debug",
      CORE_REPO_PATH: "/router/core1",
      GITHUB_WEBHOOK_SECRET: "secret",
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token",
      CORE_GITHUB_BRANCH: "production",
      CORE_HEALTH_UNITS: "sshd.service, frr.service",
      SNOWFLAKE_WORKER_ID: "7",
      SNOWFLAKE_PROCESS_ID: "11",
    },
    {
      tcpEndpoint: 8080,
      webhookEndpoint: 9301,
      logLevel: "debug",
      repositoryPath: "/router/core1",
      githubWebhookSecret: "secret",
      discordWebhookUrl: "https://discord.com/api/webhooks/123/token",
      githubBranch: "production",
      healthUnits: ["sshd.service", "frr.service"],
      snowflake: { workerId: 7, processId: 11 },
    },
  ],
  [
    "default values",
    {},
    {
      tcpEndpoint: 9300,
      webhookEndpoint: 9301,
      logLevel: "info",
      repositoryPath: undefined,
      githubWebhookSecret: undefined,
      discordWebhookUrl: undefined,
      githubBranch: "main",
      healthUnits: [],
      snowflake: { workerId: 0 },
    },
  ],
])("maps %s to the application configuration", (_name, environment, expected) => {
  expect(loadApplicationConfig({ environment })).toEqual(expected);
});

test.each([
  [{ CORE_GITHUB_BRANCH: "--delete" }, "CORE_GITHUB_BRANCH"],
  [{ CORE_GITHUB_BRANCH: "feature..oops" }, "CORE_GITHUB_BRANCH"],
  [{ CORE_GITHUB_BRANCH: "feature/--upload-pack=malicious" }, "CORE_GITHUB_BRANCH"],
  [{ DISCORD_WEBHOOK_URL: "http://discord.com/webhook" }, "HTTPS Discord"],
  [{ DISCORD_WEBHOOK_URL: "https://example.com/webhook" }, "HTTPS Discord"],
  [{ DISCORD_WEBHOOK_URL: "invalid" }, "valid Discord"],
  [{ CORE_HEALTH_UNITS: "bad unit" }, "CORE_HEALTH_UNITS"],
  [{ PORT: "9301" }, "different TCP endpoints"],
])("rejects invalid configuration %s", (environment, message) => {
  expect(() => loadApplicationConfig({ environment })).toThrow(message);
});
