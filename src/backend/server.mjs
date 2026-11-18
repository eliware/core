import Fastify from "fastify";

export default function createWebServer() {
  const server = Fastify({
    logger: false,
    ajv: { customOptions: { removeAdditional: false } },
  });
  server.removeContentTypeParser("application/json");
  server.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
    request.rawBody = body;
    try {
      done(null, JSON.parse(body.toString("utf8")));
    } catch {
      const error = new Error("Request body must contain valid JSON.");
      error.statusCode = 400;
      done(error);
    }
  });
  return server;
}
