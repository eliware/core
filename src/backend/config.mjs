import parseTcpEndpoint from "./port.mjs";
import validateBranch from "./config/branch.mjs";
import validateDiscordUrl from "./config/discord-url.mjs";
import parseHealthUnits from "./config/health-units.mjs";
import parseSnowflakeOptions from "./config/snowflake.mjs";

export default function loadApplicationConfig({ environment }) {
  const tcpEndpoint = parseTcpEndpoint(environment.PORT);
  const webhookEndpoint = parseTcpEndpoint(environment.WEBHOOK_PORT ?? "9301");
  if (tcpEndpoint === webhookEndpoint) {
    throw new Error("PORT and WEBHOOK_PORT must use different TCP endpoints.");
  }
  const githubBranch = validateBranch(environment.CORE_GITHUB_BRANCH);
  const discordWebhookUrl = validateDiscordUrl(environment.DISCORD_WEBHOOK_URL);
  const healthUnits = parseHealthUnits(environment.CORE_HEALTH_UNITS);
  const snowflake = parseSnowflakeOptions(environment);

  return {
    tcpEndpoint,
    webhookEndpoint,
    logLevel: environment.LOG_LEVEL ?? "info",
    repositoryPath: environment.CORE_REPO_PATH,
    githubWebhookSecret: environment.GITHUB_WEBHOOK_SECRET,
    discordWebhookUrl,
    githubBranch,
    healthUnits,
    snowflake,
  };
}
