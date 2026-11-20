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
        recordEvent: jest.fn(),
      })),
      createMetricsMonitor: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
        getStatus: jest.fn(),
      })),
      createSystemdEventMonitor: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
      readSystemdUnitState: jest
        .fn()
        .mockResolvedValue({ status: "unhealthy", state: "inactive", detail: "Unit is inactive" }),
      createDeploymentManager: jest.fn(() => ({ start: jest.fn(), getStatus: jest.fn() })),
    },
    log: { warn: jest.fn() },
  };
}

test("wires deployment, health checks, and Discord using runtime settings", async () => {
  const { dependencies, log } = setup();
  const configuration = {
    repositoryPath: "/etc/eliware/core1",
    tcpEndpoint: 9300,
    dashboardUrl: "https://router.example/",
    discordWebhookUrl: "https://discord.com/webhook",
    githubBranch: "main",
    healthUnits: ["frr.service"],
    snowflake: { workerId: 1 },
  };
  const integrations = createApplicationIntegrations(configuration, dependencies, log);
  expect(dependencies.createHealthMonitor).toHaveBeenCalledWith({
    units: ["frr.service"],
    onUnhealthy: expect.any(Function),
    onSystemdEvent: expect.any(Function),
  });
  await dependencies.createHealthMonitor.mock.calls[0][0].onUnhealthy({
    name: "frr.service",
    detail: "Unit is not active",
    checkedAt: "2026-11-19T12:00:00.000Z",
  });
  await dependencies.createDeploymentManager.mock.calls[0][0].notify("Deployment message");
  await dependencies.createDeploymentManager.mock.calls[0][0].notify({
    title: "✅ Core deployment succeeded",
    message: "Branch: main",
    color: 0x00ff00,
  });
  expect(dependencies.sendDiscordNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      webhookUrl: "https://discord.com/webhook",
      title: "❌ Core component failure",
      url: "https://router.example/",
      timestamp: "2026-11-19T12:00:00.000Z",
      fields: expect.arrayContaining([
        { name: "Component", value: "frr.service", inline: true },
        { name: "Event", value: "failed", inline: true },
        { name: "Current state", value: "Unit is not active" },
      ]),
    }),
  );
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
    dashboardPort: 9300,
    notify: expect.any(Function),
  });
  expect(integrations.deployment).toBeDefined();
  expect(integrations.systemdEventMonitor).toBeDefined();
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

test("uses catalog health units for the dashboard", () => {
  const { dependencies, log } = setup();
  const catalog = {
    version: 1,
    components: [
      { health: { unit: "named.service" } },
      { health: { unit: "named.service" } },
      { health: { unit: "frr.service" } },
    ],
  };

  createApplicationIntegrations(
    { repositoryPath: "/router", catalog, healthUnits: ["core.service"] },
    dependencies,
    log,
  );

  expect(dependencies.createHealthMonitor).toHaveBeenCalledWith({
    units: ["named.service", "frr.service", "core.service"],
    onUnhealthy: expect.any(Function),
    onSystemdEvent: expect.any(Function),
  });
  expect(dependencies.createDeploymentManager).toHaveBeenCalledWith(
    expect.objectContaining({ repositoryPath: "/router" }),
  );
});

test("queries the live unit state and sends event alerts with the dashboard link", async () => {
  const { dependencies, log } = setup();
  const catalog = { components: [{ id: "dns", name: "DNS", health: { unit: "named.service" } }] };
  createApplicationIntegrations(
    { catalog, tcpEndpoint: 9300, discordWebhookUrl: "https://discord.com/webhook" },
    dependencies,
    log,
  );
  const eventOptions = dependencies.createSystemdEventMonitor.mock.calls[0][0];
  const event = {
    name: "named.service",
    event: "restarted",
    checkedAt: "2026-11-19T12:00:00.000Z",
  };
  await eventOptions.onEvent(event);
  expect(dependencies.readSystemdUnitState).toHaveBeenCalledWith("named.service");
  const healthMonitor = dependencies.createHealthMonitor.mock.results[0].value;
  expect(healthMonitor.recordEvent).toHaveBeenCalledWith({
    ...event,
    status: "unhealthy",
    state: "inactive",
    detail: "Unit is inactive",
  });
  const healthOptions = dependencies.createHealthMonitor.mock.calls[0][0];
  await healthOptions.onSystemdEvent({ ...event, status: "healthy", state: "active (running)" });
  expect(dependencies.sendDiscordNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      webhookUrl: "https://discord.com/webhook",
      title: "🔄 Core component restarted",
      url: "http://127.0.0.1:9300/",
      fields: expect.arrayContaining([
        { name: "Component", value: "DNS", inline: true },
        { name: "Current state", value: "active (running)" },
        { name: "Dashboard", value: "[Open dashboard](http://127.0.0.1:9300/)" },
      ]),
    }),
  );
});

test("sends stopped component details and reports Discord delivery errors", async () => {
  const { dependencies, log } = setup();
  dependencies.sendDiscordNotification.mockRejectedValue(new Error("offline"));
  const configuration = { healthUnits: ["frr.service"], tcpEndpoint: 9300 };
  createApplicationIntegrations(configuration, dependencies, log);
  const options = dependencies.createHealthMonitor.mock.calls[0][0];
  await options.onSystemdEvent({ name: "frr.service", event: "stopped", status: "healthy" });
  expect(dependencies.sendDiscordNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "⚠️ Core component stopped",
      url: "http://127.0.0.1:9300/",
      fields: expect.arrayContaining([
        { name: "Component", value: "frr.service", inline: true },
        { name: "Event time", value: "Unknown" },
        { name: "Current state", value: "Unknown" },
      ]),
    }),
  );
  expect(log.warn).toHaveBeenCalledWith(
    "Discord notification failed for systemd event frr.service",
  );
  await dependencies.createHealthMonitor.mock.calls[0][0].onUnhealthy({ name: "frr.service" });
  expect(log.warn).toHaveBeenCalledWith("Discord notification failed for health check frr.service");
});
