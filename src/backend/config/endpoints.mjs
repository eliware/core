export default function validateEndpoints(tcpEndpoint, webhookEndpoint) {
  if (tcpEndpoint === webhookEndpoint) {
    throw new Error("PORT and WEBHOOK_PORT must use different TCP endpoints.");
  }
}
