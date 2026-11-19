import { expect, jest, test } from "@jest/globals";
import createApplicationIntegrations from "../../src/backend/main-integrations.mjs";

function setup() {
  return {
    dependencies: {
      sendDiscordNotification: jest.fn().mockResolvedValue(true),
      createHealthMonitor: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
        getStatus: jest.fn(),
      })),
      createDeploymentManager: jest.fn(() => ({ start: jest.fn(), getStatus: jest.fn() })),
    },
    log: { warn: jest.fn() },
  };
}

test("wires deployment, health checks, and Discord using runtime settings", async () => {
  const { dependencies, log } = setup();
  const configuration = {
    repositoryPath: "/etc/eliware/core1",
    discordWebhookUrl: "https://discord.com/webhook",
    githubBranch: "main",
    healthUnits: ["frr.service"],
    snowflake: { workerId: 1 },
  };
  const integrations = createApplicationIntegrations(configuration, dependencies, log);
  expect(dependencies.createHealthMonitor).toHaveBeenCalledWith({
    units: ["frr.service"],
    onUnhealthy: expect.any(Function),
  });
  await dependencies.createHealthMonitor.mock.calls[0][0].onUnhealthy({
    name: "frr.service",
    detail: "Unit is not active",
  });
  await dependencies.createDeploymentManager.mock.calls[0][0].notify("Deployment message");
  await dependencies.createDeploymentManager.mock.calls[0][0].notify({
    title: "✅ Core deployment succeeded",
    message: "Branch: main",
    color: 0x00ff00,
  });
  expect(dependencies.sendDiscordNotification).toHaveBeenCalledWith({
    webhookUrl: "https://discord.com/webhook",
    message: "Deployment message",
  });
  expect(dependencies.sendDiscordNotification).toHaveBeenLastCalledWith({
    webhookUrl: "https://discord.com/webhook",
    title: "✅ Core deployment succeeded",
    message: "Branch: main",
    color: 0x00ff00,
  });
  expect(dependencies.createDeploymentManager).toHaveBeenCalledWith({
    repositoryPath: "/etc/eliware/core1",
    branch: "main",
    snowflake: { workerId: 1 },
    notify: expect.any(Function),
  });
  expect(integrations.deployment).toBeDefined();
});

test("logs Discord notification failures for health checks", async () => {
  const { dependencies, log } = setup();
  dependencies.sendDiscordNotification.mockRejectedValue(new Error("Discord unavailable"));
  const integrations = createApplicationIntegrations({ healthUnits: [] }, dependencies, log);
  await dependencies.createHealthMonitor.mock.calls[0][0].onUnhealthy({
    name: "frr.service",
    detail: "inactive",
  });
  expect(log.warn).toHaveBeenCalledWith("Discord notification failed for health check frr.service");
  expect(integrations.healthMonitor).toBeDefined();
});
