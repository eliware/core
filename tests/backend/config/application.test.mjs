import { expect, test } from "@jest/globals";
import { resolve } from "node:path";
import loadApplicationSettings from "../../../src/backend/config/application.mjs";

test("assembles and validates application settings", () => {
  expect(
    loadApplicationSettings({
      port: "8080",
      dashboardUrl: "https://router.example.com/",
      webhookPort: "8081",
      logLevel: "debug",
      githubBranch: "production",
      healthUnits: "sshd.service, frr.service",
      workerId: "7",
      processId: "11",
    }),
  ).toMatchObject({
    tcpEndpoint: 8080,
    dashboardUrl: "https://router.example.com/",
    webhookEndpoint: 8081,
    logLevel: "debug",
    githubBranch: "production",
    healthUnits: ["sshd.service", "frr.service"],
    catalog: null,
    snowflake: { workerId: 7, processId: 11 },
  });
});

test("loads the catalog while keeping extra health units", () => {
  const settings = loadApplicationSettings({
    port: "8080",
    repositoryPath: resolve("test-fixtures/router-catalog"),
    webhookPort: "8081",
    healthUnits: "core.service",
    workerId: "1",
    processId: "1",
  });

  expect(settings.catalog.components[0].health.unit).toBe("named.service");
  expect(settings.healthUnits).toEqual(["core.service"]);
});
