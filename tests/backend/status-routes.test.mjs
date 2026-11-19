import Fastify from "fastify";
import { afterEach, expect, test } from "@jest/globals";
import registerStatusRoutes from "../../src/backend/status-routes.mjs";

let server;

afterEach(async () => {
  if (server) await server.close();
  server = undefined;
});

test.each([
  ["/health", { status: "ok" }],
  ["/ready", { status: "ready" }],
])("returns a successful status from %s", async (url, expected) => {
  server = Fastify({ logger: false });
  registerStatusRoutes(server);

  const result = await server.inject({ method: "GET", url });
  expect(result.statusCode).toBe(200);
  expect(result.json()).toEqual(expected);
});

test("reports not ready until all application listeners start", async () => {
  server = Fastify({ logger: false });
  registerStatusRoutes(server, { isReady: () => false });
  const response = await server.inject({ method: "GET", url: "/ready" });
  expect(response.statusCode).toBe(503);
  expect(response.json()).toEqual({ status: "starting" });
});

test("returns health and deployment snapshots from the read-only status endpoint", async () => {
  server = Fastify({ logger: false });
  registerStatusRoutes(server, {
    getHealthStatus: () => ({ status: "unhealthy", units: [{ name: "frr.service" }] }),
    getDeploymentStatus: () => ({ status: "failed", failedStep: "npm test" }),
    getMetricsStatus: () => ({ checkedAt: "2026-11-19T12:00:00.000Z", components: [] }),
  });
  const result = await server.inject({ method: "GET", url: "/api/status" });
  expect(result.statusCode).toBe(200);
  expect(result.json()).toEqual({
    health: { status: "unhealthy", units: [{ name: "frr.service" }] },
    metrics: { checkedAt: "2026-11-19T12:00:00.000Z", components: [] },
    deployment: { status: "failed", failedStep: "npm test" },
  });
});

test("returns default status when no providers are configured", async () => {
  server = Fastify({ logger: false });
  registerStatusRoutes(server);
  const result = await server.inject({ method: "GET", url: "/api/status" });
  expect(result.json()).toEqual({
    health: { status: "unconfigured", checkedAt: null, units: [] },
    metrics: { checkedAt: null, components: [] },
    deployment: { status: "idle", steps: [] },
  });
});
