import { expect, jest, test } from "@jest/globals";
import loadRuntimeConfig from "../../../src/backend/runtime/config.mjs";

test("loads environment values before assembling application configuration", () => {
  const loadEnvironment = jest.fn();

  expect(
    loadRuntimeConfig({
      environment: {
        PORT: "8080",
        LOG_LEVEL: "debug",
        SNOWFLAKE_WORKER_ID: "1",
        SNOWFLAKE_PROCESS_ID: "2",
      },
      loadEnvironment,
    }),
  ).toEqual({
    tcpEndpoint: 8080,
    webhookEndpoint: 9301,
    logLevel: "debug",
    repositoryPath: undefined,
    githubWebhookSecret: undefined,
    discordWebhookUrl: undefined,
    githubBranch: "main",
    healthUnits: [],
    catalog: null,
    snowflake: { workerId: 1, processId: 2 },
  });
  expect(loadEnvironment).toHaveBeenCalledTimes(1);
});

test("uses the default loader and process environment", () => {
  const previous = process.env;
  process.env = {
    ...previous,
    PORT: "8080",
    WEBHOOK_PORT: "8081",
    SNOWFLAKE_WORKER_ID: "1",
    SNOWFLAKE_PROCESS_ID: "2",
  };

  try {
    expect(loadRuntimeConfig()).toMatchObject({
      tcpEndpoint: 8080,
      webhookEndpoint: 8081,
      snowflake: { workerId: 1, processId: 2 },
    });
  } finally {
    process.env = previous;
  }
});
