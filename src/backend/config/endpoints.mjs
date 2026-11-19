function parseTcpEndpoint(value) {
  const input = value ?? 9300;
  const validInput =
    typeof input === "number" || (typeof input === "string" && /^\d+$/u.test(input));
  const endpoint = validInput ? Number(input) : Number.NaN;
  if (!Number.isInteger(endpoint) || endpoint < 1 || endpoint > 65535) {
    throw new Error("Set the TCP endpoint value to an integer from 1 through 65535");
  }
  return endpoint;
}

export default function parseEndpoints(port, webhookPort) {
  const tcpEndpoint = parseTcpEndpoint(port);
  const webhookEndpoint = parseTcpEndpoint(webhookPort);
  if (tcpEndpoint === webhookEndpoint) {
    throw new Error("PORT and WEBHOOK_PORT must use different TCP endpoints.");
  }
  return { tcpEndpoint, webhookEndpoint };
}
