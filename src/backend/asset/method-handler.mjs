export default function createAssetMethodHandler(handler) {
  return function handleAssetMethod(request, reply) {
    if (request.method !== "GET") {
      return reply.code(405).type("text/plain").send("Method not allowed");
    }
    return handler(request, reply);
  };
}
