export default function sendAssetResponse(reply, route, content) {
  if (content === null) return reply.code(404).type("text/plain").send("Not found");
  return reply.type(route.contentType).send(content);
}
