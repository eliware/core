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

test("returns health and deployment snapshots from the read-only status endpoint", async () => {
  server = Fastify({ logger: false });
  registerStatusRoutes(server, {
    getHealthStatus: () => ({ status: "unhealthy", units: [{ name: "frr.service" }] }),
    getDeploymentStatus: () => ({ status: "failed", failedStep: "npm test" }),
  });
  const result = await server.inject({ method: "GET", url: "/api/status" });
  expect(result.statusCode).toBe(200);
  expect(result.json()).toEqual({
    health: { status: "unhealthy", units: [{ name: "frr.service" }] },
    deployment: { status: "failed", failedStep: "npm test" },
  });
});

test("returns default status when no providers are configured", async () => {
  server = Fastify({ logger: false });
  registerStatusRoutes(server);
  const result = await server.inject({ method: "GET", url: "/api/status" });
  expect(result.json()).toEqual({
    health: { status: "unconfigured", checkedAt: null, units: [] },
    deployment: { status: "idle", steps: [] },
  });
});
