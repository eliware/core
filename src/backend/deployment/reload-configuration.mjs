import runCatalogActions from "./catalog-actions.mjs";
import planCatalogActions from "./plan-catalog-actions.mjs";
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
  const actions = await planCatalogActions({ catalog, repositoryPath, previousCommit, run });
  onPlan(actions);
  if (actions.length) {
    onReloadStart();
    await runCatalogActions({ actions, repositoryPath, run, steps, onStart });
    return { actions, started: true };
  }
  steps.push({ name: "No catalog components changed", status: "passed" });
  onStart("No catalog components changed", steps);
  return { actions, started: false };
}
