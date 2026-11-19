import createDeploymentDiscordNotification from "./discord-notification.mjs";

export default async function notifyDeployment({ status, notify, branch, githubPayload }) {
  try {
    await notify(createDeploymentDiscordNotification({ ...status.get(), branch, githubPayload }));
  } catch {
    status.update({ notificationError: "Discord notification failed." });
  }
}
