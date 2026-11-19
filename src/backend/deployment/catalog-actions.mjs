import runDeploymentStep from "./step.mjs";

export default async function runCatalogActions({
  actions,
  repositoryPath,
  run,
  steps,
  onStart,
  prefix = "",
}) {
  for (const { operation, unit } of actions) {
    const name = `${prefix}${operation} ${unit}`;
    await runDeploymentStep({
      name,
      command: "systemctl",
      args: [operation, unit],
      repositoryPath,
      run,
      steps,
      onStart,
    });
  }
}
