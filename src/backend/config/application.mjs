import validateBranch from "./branch.mjs";
import validateDiscordUrl from "./discord-url.mjs";
import parseHealthUnits from "./health-units.mjs";
import parseSnowflakeOptions from "./snowflake.mjs";
import parseEndpoints from "./endpoints.mjs";
import loadServiceCatalog from "../../service-catalog/load.mjs";
import validateDashboardUrl from "./dashboard-url.mjs";

export default function loadApplicationSettings(application) {
  const { tcpEndpoint, webhookEndpoint } = parseEndpoints(
    application.port,
    application.webhookPort,
  );
  return {
    tcpEndpoint,
    dashboardUrl: validateDashboardUrl(application.dashboardUrl, tcpEndpoint),
    webhookEndpoint,
    logLevel: application.logLevel,
    repositoryPath: application.repositoryPath,
    githubWebhookSecret: application.githubWebhookSecret,
    discordWebhookUrl: validateDiscordUrl(application.discordWebhookUrl),
    githubBranch: validateBranch(application.githubBranch),
    healthUnits: parseHealthUnits(application.healthUnits),
    catalog: loadServiceCatalog(application.repositoryPath ?? process.cwd()),
    snowflake: parseSnowflakeOptions({
      SNOWFLAKE_WORKER_ID: application.workerId,
      SNOWFLAKE_PROCESS_ID: application.processId,
    }),
  };
}
