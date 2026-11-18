import parseTcpEndpoint from "./port.mjs";

export default function loadApplicationConfig({ environment }) {
  const tcpEndpoint = parseTcpEndpoint(environment.PORT);
  const webhookEndpoint = parseTcpEndpoint(environment.WEBHOOK_PORT ?? "9301");
  if (tcpEndpoint === webhookEndpoint) {
    throw new Error("PORT and WEBHOOK_PORT must use different TCP endpoints.");
  }
  const githubBranch = environment.CORE_GITHUB_BRANCH ?? "main";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(githubBranch) || githubBranch.includes("..")) {
    throw new Error("CORE_GITHUB_BRANCH must be a valid branch name.");
  }
  const discordWebhookUrl = environment.DISCORD_WEBHOOK_URL;
  if (discordWebhookUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(discordWebhookUrl);
    } catch {
      throw new Error("DISCORD_WEBHOOK_URL must be a valid Discord webhook URL.");
    }
    if (
      parsedUrl.protocol !== "https:" ||
      !["discord.com", "discordapp.com"].includes(parsedUrl.hostname)
    ) {
      throw new Error("DISCORD_WEBHOOK_URL must use an HTTPS Discord hostname.");
    }
  }
  const healthUnits = (environment.CORE_HEALTH_UNITS ?? "")
    .split(",")
    .map((unit) => unit.trim())
    .filter(Boolean);
  if (healthUnits.some((unit) => !/^[a-zA-Z0-9_.@-]+\.service$/.test(unit))) {
    throw new Error("CORE_HEALTH_UNITS must contain systemd service unit names.");
  }

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
