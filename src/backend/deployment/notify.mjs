import createDeploymentDiscordNotification from "./discord-notification.mjs";

export default async function notifyDeployment({ status, notify, branch, githubPayload }) {
  try {
    await notify(createDeploymentDiscordNotification({ ...status.get(), branch, githubPayload }));
  } catch {
    try {
      status.update({ notificationError: "Discord notification failed." });
    } catch {
      // Notification errors do not stop deployment recovery or cleanup.
    }
  }
}
