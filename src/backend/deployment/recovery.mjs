import runCatalogActions from "./catalog-actions.mjs";

export default async function recoverDeployment({
  run,
  repositoryPath,
  previousCommit,
  reloadStarted,
  steps,
  catalogActions,
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
  if (reloadStarted && restored) {
    try {
      if (catalogActions) {
        await runCatalogActions({
          actions: catalogActions,
          repositoryPath,
          run,
          steps,
          onStart: () => {},
          prefix: "restore ",
        });
      } else {
        await run("npm", ["run", "reload"], {
          cwd: repositoryPath,
          timeout: 15 * 60_000,
          maxBuffer: 1024 * 1024,
        });
        steps.push({ name: "reload previous configuration", status: "passed" });
      }
    } catch (error) {
      steps.push({
        name: catalogActions ? "restore catalog actions" : "reload previous configuration",
        status: "failed",
        detail: String(error?.message ?? error).slice(0, 300),
      });
      recovery = [recovery, "Previous commit restored, but its reload failed."]
        .filter(Boolean)
        .join(" ");
    }
  }
  return recovery;
}
