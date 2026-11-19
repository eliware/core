import validateDeploymentRepository from "./validate-repository.mjs";
import reloadConfiguration from "./reload-configuration.mjs";

export default async function prepareDeployment({
  repositoryPath,
  branch,
  run,
  readVersion,
  loadCatalog,
  runStep,
  verifyCleanWorktree,
  steps,
  state,
  onStart,
}) {
  state.previousCommit = await validateDeploymentRepository({ run, repositoryPath, branch });
  await runStep("git pull", "git", ["pull", "--ff-only", "--", "origin", branch]);
  await verifyCleanWorktree("git pull");
  state.previousCoreVersion = await readVersion(repositoryPath);
  await runStep("npm ci --include=dev", "npm", ["ci", "--include=dev"]);
  await verifyCleanWorktree("npm ci --include=dev");
  await runStep("npm test", "npm", ["test"]);
  await verifyCleanWorktree("npm test");
  await runStep("npm run preflight", "npm", ["run", "preflight"]);
  await verifyCleanWorktree("npm run preflight");
  await reloadConfiguration({
    previousCommit: state.previousCommit,
    repositoryPath,
    run,
    loadCatalog,
    runStep,
    steps,
    onPlan: (actions) => {
      state.catalogActions = actions;
    },
    onReloadStart: () => {
      state.reloadStarted = true;
    },
    onStart,
  });
}
