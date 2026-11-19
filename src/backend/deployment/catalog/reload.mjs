import runCatalogActions from "../catalog-actions.mjs";
import planCatalogActions from "../plan-catalog-actions.mjs";

export default async function reloadCatalogConfiguration({
  catalog,
  repositoryPath,
  previousCommit,
  run,
  steps,
  onStart,
  onPlan,
  onReloadStart,
}) {
  const actions = await planCatalogActions({ catalog, repositoryPath, previousCommit, run });
  onPlan(actions);
  if (!actions.length) return { actions, started: false };
  onReloadStart();
  await runCatalogActions({ actions, repositoryPath, run, steps, onStart });
  return { actions, started: true };
}
