import verifyGitHubSignature from "./github-signature.mjs";

export default function registerWebhookRoutes(
  server,
  { secret, branch = "main", enabled = true, deployment },
) {
  const deliveries = new Map();
  const maximumRememberedDeliveries = 1000;

  server.post("/api/github/webhook", async (request, reply) => {
    if (!enabled || !secret) return reply.code(503).send({ error: "Webhook is not configured." });
    if (
      !verifyGitHubSignature({
        body: request.rawBody,
        signature: request.headers["x-hub-signature-256"],
        secret,
      })
    ) {
      return reply.code(401).send({ error: "Webhook signature is invalid." });
    }

    const event = request.headers["x-github-event"];
    if (event !== "push") return reply.code(202).send({ accepted: false, reason: "event ignored" });
    const delivery = request.headers["x-github-delivery"];
    if (typeof delivery !== "string" || delivery.length > 100) {
      return reply.code(400).send({ error: "Webhook delivery ID is invalid." });
    }
    if (deliveries.has(delivery))
      return reply.code(202).send({ accepted: false, reason: "duplicate delivery" });
    if (request.body?.ref !== `refs/heads/${branch}`) {
      return reply.code(202).send({ accepted: false, reason: "branch ignored" });
    }

    const result = deployment.start(delivery);
    if (!result.accepted) return reply.code(409).send(result);
    deliveries.set(delivery, true);
    if (deliveries.size > maximumRememberedDeliveries)
      deliveries.delete(deliveries.keys().next().value);
    return reply.code(202).send(result);
  });
}
