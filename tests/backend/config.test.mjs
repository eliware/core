import { expect, test } from "@jest/globals";
import loadApplicationConfig from "../../src/backend/config.mjs";

test("assembles and validates parsed application configuration", () => {
  expect(
    loadApplicationConfig({
      environment: {
        PORT: "8080",
        WEBHOOK_PORT: "8081",
        LOG_LEVEL: "debug",
        CORE_GITHUB_BRANCH: "production",
        CORE_HEALTH_UNITS: "sshd.service, frr.service",
        SNOWFLAKE_WORKER_ID: "7",
        SNOWFLAKE_PROCESS_ID: "11",
      },
    }),
  ).toMatchObject({
    tcpEndpoint: 8080,
    webhookEndpoint: 8081,
    logLevel: "debug",
    githubBranch: "production",
    healthUnits: ["sshd.service", "frr.service"],
    snowflake: { workerId: 7, processId: 11 },
  });
});

test.each([
  [{ CORE_GITHUB_BRANCH: "--delete" }, "CORE_GITHUB_BRANCH"],
  [{ CORE_GITHUB_BRANCH: "feature..oops" }, "CORE_GITHUB_BRANCH"],
  [{ CORE_GITHUB_BRANCH: "feature/--upload-pack=malicious" }, "CORE_GITHUB_BRANCH"],
  [{ DISCORD_WEBHOOK_URL: "http://discord.com/webhook" }, "HTTPS Discord"],
  [{ DISCORD_WEBHOOK_URL: "https://example.com/webhook" }, "HTTPS Discord"],
  [{ DISCORD_WEBHOOK_URL: "invalid" }, "valid Discord"],
  [{ CORE_HEALTH_UNITS: "bad unit" }, "CORE_HEALTH_UNITS"],
])("rejects invalid configuration %s", (environment, message) => {
  expect(() => loadApplicationConfig({ environment })).toThrow(message);
});
