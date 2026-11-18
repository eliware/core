export default async function recoverDeployment({
  run,
  repositoryPath,
  previousCommit,
  reloadStarted,
  steps,
}) {
  let recovery;
  try {
    await run("git", ["reset", "--hard", previousCommit], { cwd: repositoryPath });
    await run("git", ["clean", "-fd"], { cwd: repositoryPath });
    steps.push({ name: "restore previous commit", status: "passed" });
    if (reloadStarted) {
      try {
        await run("npm", ["run", "reload"], {
          cwd: repositoryPath,
          timeout: 15 * 60_000,
          maxBuffer: 1024 * 1024,
        });
        steps.push({ name: "reload previous configuration", status: "passed" });
      } catch (error) {
        steps.push({
          name: "reload previous configuration",
          status: "failed",
          detail: String(error?.message ?? error).slice(0, 300),
        });
        recovery = "Previous commit restored, but its reload failed.";
      }
    }
  } catch (error) {
    recovery = `Previous commit restore failed: ${String(error?.message ?? error).slice(0, 200)}`;
    steps.push({ name: "restore previous commit", status: "failed" });
  }
  return recovery;
}
