export default async function recoverDeployment({
  run,
  repositoryPath,
  previousCommit,
  reloadStarted,
  steps,
}) {
  let recovery;
  let restored = false;
  try {
    await run("git", ["reset", "--hard", previousCommit], { cwd: repositoryPath });
    restored = true;
    steps.push({ name: "restore previous commit", status: "passed" });
  } catch (error) {
    recovery = `Previous commit restore failed: ${String(error?.message ?? error).slice(0, 200)}`;
    steps.push({ name: "restore previous commit", status: "failed" });
  }
  if (reloadStarted) {
    const reloadName = restored
      ? "reload previous configuration"
      : "reload configuration after restore failure";
    try {
      await run("npm", ["run", "reload"], {
        cwd: repositoryPath,
        timeout: 15 * 60_000,
        maxBuffer: 1024 * 1024,
      });
      steps.push({ name: reloadName, status: "passed" });
    } catch (error) {
      steps.push({
        name: reloadName,
        status: "failed",
        detail: String(error?.message ?? error).slice(0, 300),
      });
      recovery = [
        recovery,
        restored
          ? "Previous commit restored, but its reload failed."
          : "Configuration reload also failed.",
      ]
        .filter(Boolean)
        .join(" ");
    }
  }
  return recovery;
}
