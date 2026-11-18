import parseTcpEndpoint from "./port.mjs";
import validateBranch from "./config/branch.mjs";
import validateDiscordUrl from "./config/discord-url.mjs";
import parseHealthUnits from "./config/health-units.mjs";
import parseSnowflakeOptions from "./config/snowflake.mjs";
import mapApplicationConfig from "./config/application.mjs";

export default function loadApplicationConfig({ environment }) {
  const application = mapApplicationConfig(environment);
  const tcpEndpoint = parseTcpEndpoint(application.port);
  const webhookEndpoint = parseTcpEndpoint(application.webhookPort);
  if (tcpEndpoint === webhookEndpoint) {
    throw new Error("PORT and WEBHOOK_PORT must use different TCP endpoints.");
  }
  const githubBranch = validateBranch(application.githubBranch);
  const discordWebhookUrl = validateDiscordUrl(application.discordWebhookUrl);
  const healthUnits = parseHealthUnits(application.healthUnits);
  const snowflake = parseSnowflakeOptions({
    SNOWFLAKE_WORKER_ID: application.workerId,
    SNOWFLAKE_PROCESS_ID: application.processId,
  });

  return {
    tcpEndpoint,
    webhookEndpoint,
    logLevel: application.logLevel,
    repositoryPath: application.repositoryPath,
    githubWebhookSecret: application.githubWebhookSecret,
    discordWebhookUrl,
    githubBranch,
    healthUnits,
    snowflake,
  };
}
