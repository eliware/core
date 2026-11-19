import { expect, test } from "@jest/globals";
import { resolve } from "node:path";
import loadApplicationConfig from "../../src/backend/config.mjs";

test("assembles and validates parsed application configuration", () => {
  expect(
    loadApplicationConfig({
      environment: {
        PORT: "8080",
        CORE_DASHBOARD_URL: "https://router.example/",
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
    dashboardUrl: "https://router.example/",
    webhookEndpoint: 8081,
    logLevel: "debug",
    githubBranch: "production",
    healthUnits: ["sshd.service", "frr.service"],
    catalog: null,
    snowflake: { workerId: 7, processId: 11 },
  });
});

test("uses service catalog health units instead of environment unit overrides", () => {
  const configuration = loadApplicationConfig({
    environment: {
      CORE_REPO_PATH: resolve("test-fixtures/router-catalog"),
      CORE_HEALTH_UNITS: "invalid unit value",
      SNOWFLAKE_WORKER_ID: "1",
      SNOWFLAKE_PROCESS_ID: "1",
    },
  });

  expect(configuration.catalog.components[0].health.unit).toBe("named.service");
  expect(configuration.healthUnits).toEqual([]);
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
  expect(() =>
    loadApplicationConfig({
      environment: { SNOWFLAKE_WORKER_ID: "1", SNOWFLAKE_PROCESS_ID: "1", ...environment },
    }),
  ).toThrow(message);
});
