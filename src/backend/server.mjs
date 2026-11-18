import Fastify from "fastify";

export default function createWebServer() {
  return Fastify({
    logger: false,
    ajv: { customOptions: { removeAdditional: false } },
  });
}
