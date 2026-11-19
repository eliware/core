import verifyGitHubSignature from "./github-signature.mjs";

export default function registerWebhookRoutes(
  server,
  { secret, branch = "main", enabled = true, deployment, maximumRememberedDeliveries = 1000 },
) {
  const deliveries = new Map();

  function rememberBusy(delivery) {
    deliveries.set(delivery, "busy");
    if (deliveries.size <= maximumRememberedDeliveries) return;
    for (const [id, status] of deliveries) {
      if (status !== "accepted") {
        deliveries.delete(id);
        if (deliveries.size <= maximumRememberedDeliveries) return;
      }
    }
  }

  server.post("/api/github/webhook", async (request, reply) => {
    if (!enabled || !secret) return reply.code(503).send({ error: "Webhook is not configured." });
    if (!/^application\/json(?:\s*;|$)/iu.test(request.headers["content-type"]))
      return reply.code(415).send({ error: "Webhook content type must be application/json." });
    if (
      !verifyGitHubSignature({
        body: request.rawBody,
        signature: request.headers["x-hub-signature-256"],
        secret,
      })
    ) {
      return reply.code(401).send({ error: "Webhook signature is invalid." });
    }
    if (!request.body || typeof request.body !== "object" || Array.isArray(request.body))
      return reply.code(400).send({ error: "Webhook body must be a JSON object." });

    const event = request.headers["x-github-event"];
    if (event !== "push") return reply.code(202).send({ accepted: false, reason: "event ignored" });
    const delivery = request.headers["x-github-delivery"];
    if (typeof delivery !== "string" || delivery.length > 100) {
      return reply.code(400).send({ error: "Webhook delivery ID is invalid." });
    }
    if (request.body.ref !== `refs/heads/${branch}`) {
      return reply.code(202).send({ accepted: false, reason: "branch ignored" });
    }
    if (deliveries.get(delivery) === "accepted")
      return reply.code(202).send({ accepted: false, reason: "duplicate delivery" });

    const result = deployment.start(delivery, request.body);
    if (!result.accepted) {
      if (result.status === "busy") {
        rememberBusy(delivery);
      }
      if (result.status === "unavailable" || result.status === "unconfigured")
        return reply.code(503).send(result);
      return reply.code(409).send(result);
    }
    deliveries.set(delivery, "accepted");
    return reply.code(202).send(result);
  });
}
