export default function loadApplicationValues(environment) {
  return {
    port: environment.PORT,
    dashboardUrl: environment.CORE_DASHBOARD_URL,
    webhookPort: environment.WEBHOOK_PORT ?? "9301",
    logLevel: environment.LOG_LEVEL ?? "info",
    repositoryPath: environment.CORE_REPO_PATH,
    githubWebhookSecret: environment.GITHUB_WEBHOOK_SECRET,
    discordWebhookUrl: environment.DISCORD_WEBHOOK_URL,
    githubBranch: environment.CORE_GITHUB_BRANCH,
    healthUnits: environment.CORE_HEALTH_UNITS,
    workerId: environment.SNOWFLAKE_WORKER_ID,
    processId: environment.SNOWFLAKE_PROCESS_ID,
  };
}
