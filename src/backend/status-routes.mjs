export default function registerStatusRoutes(
  server,
  {
    getHealthStatus = () => ({ status: "unconfigured", checkedAt: null, units: [] }),
    getMetricsStatus = () => ({ checkedAt: null, components: [] }),
    getDeploymentStatus = () => ({ status: "idle", steps: [] }),
    isReady = () => true,
  } = {},
) {
  server.get("/health", async (_request, reply) => reply.send({ status: "ok" }));
  server.get("/ready", async (_request, reply) =>
    isReady() ? reply.send({ status: "ready" }) : reply.code(503).send({ status: "starting" }),
  );
  server.get("/api/status", async (_request, reply) =>
    reply.send({
      health: getHealthStatus(),
      metrics: getMetricsStatus(),
      deployment: getDeploymentStatus(),
    }),
  );
}
