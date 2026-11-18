import parseTcpEndpoint from "./port.mjs";
import validateBranch from "./config/branch.mjs";
import validateDiscordUrl from "./config/discord-url.mjs";
import parseHealthUnits from "./config/health-units.mjs";

export default function loadApplicationConfig({ environment }) {
  const tcpEndpoint = parseTcpEndpoint(environment.PORT);
  const repositoryName = environment.CORE_REPO_PATH?.split(/[\\/]/u).filter(Boolean).at(-1);
  const defaultWebhookPort = repositoryName?.toLowerCase() === "core2" ? "9302" : "9301";
  const webhookEndpoint = parseTcpEndpoint(environment.WEBHOOK_PORT ?? defaultWebhookPort);
  if (tcpEndpoint === webhookEndpoint) {
    throw new Error("PORT and WEBHOOK_PORT must use different TCP endpoints.");
  }
  const githubBranch = validateBranch(environment.CORE_GITHUB_BRANCH);
  const discordWebhookUrl = validateDiscordUrl(environment.DISCORD_WEBHOOK_URL);
  const healthUnits = parseHealthUnits(environment.CORE_HEALTH_UNITS);

  return {
    tcpEndpoint,
    webhookEndpoint,
    logLevel: environment.LOG_LEVEL ?? "info",
    repositoryPath: environment.CORE_REPO_PATH,
    githubWebhookSecret: environment.GITHUB_WEBHOOK_SECRET,
    discordWebhookUrl,
    githubBranch,
    healthUnits,
  };
}
