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

test("keeps environment health units alongside the service catalog", () => {
  const configuration = loadApplicationConfig({
    environment: {
      CORE_REPO_PATH: resolve("test-fixtures/router-catalog"),
      CORE_HEALTH_UNITS: "core.service",
      SNOWFLAKE_WORKER_ID: "1",
      SNOWFLAKE_PROCESS_ID: "1",
    },
  });

  expect(configuration.catalog.components[0].health.unit).toBe("named.service");
  expect(configuration.healthUnits).toEqual(["core.service"]);
});
