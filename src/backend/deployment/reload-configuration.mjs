import reloadCatalogConfiguration from "./catalog/reload.mjs";
import loadServiceCatalog from "../../service-catalog/load.mjs";

export default async function reloadConfiguration({
  previousCommit,
  repositoryPath,
  run,
  loadCatalog = loadServiceCatalog,
  runStep,
  steps,
  onStart,
  onPlan,
  onReloadStart,
}) {
  const catalog = loadCatalog(repositoryPath);
  if (!catalog) {
    onReloadStart();
    await runStep("npm run reload", "npm", ["run", "reload"]);
    return { actions: undefined, started: true };
  }
  const result = await reloadCatalogConfiguration({
    catalog,
    repositoryPath,
    previousCommit,
    run,
    steps,
    onStart,
    onPlan,
    onReloadStart,
  });
  if (result.started) return result;
  steps.push({ name: "No catalog components changed", status: "passed" });
  onStart("No catalog components changed", steps);
  return { actions: result.actions, started: false };
}
