import runCatalogActions from "../catalog-actions.mjs";

export default async function restore(payload, steps, { run, checkReady }) {
  try {
    await run("git", ["reset", "--hard", payload.previousCommit], { cwd: payload.repositoryPath });
    steps.push({ name: "restore previous commit", status: "passed" });
    await run("npm", ["ci", "--include=dev"], { cwd: payload.repositoryPath, timeout: 900_000 });
    steps.push({ name: "restore previous dependencies", status: "passed" });
    if (Array.isArray(payload.catalogActions)) {
      await runCatalogActions({
        actions: payload.catalogActions,
        repositoryPath: payload.repositoryPath,
        run,
        steps,
        onStart: () => {},
        prefix: "restore ",
      });
    } else {
      await run("npm", ["run", "reload"], { cwd: payload.repositoryPath, timeout: 900_000 });
      steps.push({ name: "reload previous configuration", status: "passed" });
    }
    await run("systemctl", ["restart", payload.serviceUnit]);
    steps.push({ name: "restart Core with previous version", status: "passed" });
    await checkReady(payload.port, payload.serviceUnit, run);
    steps.push({ name: "check Core health after rollback", status: "passed" });
    return "Previous commit and dependencies were restored, and Core passed its health check.";
  } catch (error) {
    steps.push({
      name: "restore Core after failed restart",
      status: "failed",
      detail: String(error.message).slice(0, 300),
    });
    return `Recovery failed: ${String(error.message).slice(0, 200)}`;
  }
}
