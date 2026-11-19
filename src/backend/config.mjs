import parseTcpEndpoint from "./port.mjs";
import validateBranch from "./config/branch.mjs";
import validateDiscordUrl from "./config/discord-url.mjs";
import parseHealthUnits from "./config/health-units.mjs";
import parseSnowflakeOptions from "./config/snowflake.mjs";
import loadApplicationValues from "./config/loader.mjs";
import validateEndpoints from "./config/endpoints.mjs";
import loadServiceCatalog from "../service-catalog/load.mjs";
import validateDashboardUrl from "./config/dashboard-url.mjs";

export default function loadApplicationConfig({ environment }) {
  const application = loadApplicationValues(environment);
  const tcpEndpoint = parseTcpEndpoint(application.port);
  const webhookEndpoint = parseTcpEndpoint(application.webhookPort);
  validateEndpoints(tcpEndpoint, webhookEndpoint);
  const githubBranch = validateBranch(application.githubBranch);
  const dashboardUrl = validateDashboardUrl(application.dashboardUrl, tcpEndpoint);
  const discordWebhookUrl = validateDiscordUrl(application.discordWebhookUrl);
  const catalog = loadServiceCatalog(application.repositoryPath ?? process.cwd());
  const healthUnits = catalog ? [] : parseHealthUnits(application.healthUnits);
  const snowflake = parseSnowflakeOptions({
    SNOWFLAKE_WORKER_ID: application.workerId,
    SNOWFLAKE_PROCESS_ID: application.processId,
  });

  return {
    tcpEndpoint,
    dashboardUrl,
    webhookEndpoint,
    logLevel: application.logLevel,
    repositoryPath: application.repositoryPath,
    githubWebhookSecret: application.githubWebhookSecret,
    discordWebhookUrl,
    githubBranch,
    healthUnits,
    catalog,
    snowflake,
  };
}
