export default async function restartCoreAfterUpdate({
  previousVersion,
  readVersion,
  scheduleRestart,
  run,
  runId,
  repositoryPath,
  previousCommit,
  catalogActions,
  status,
  serviceUnit,
  port,
  branch,
  githubPayload,
}) {
  const installedVersion = await readVersion(repositoryPath);
  if (!previousVersion || !installedVersion || previousVersion === installedVersion) return false;
  const restartStatus = status.get();
  restartStatus.currentStep = "restart Core service";
  restartStatus.steps.push({ name: "restart Core service", status: "running" });
  status.set(restartStatus);
  await scheduleRestart({
    run,
    runId,
    repositoryPath,
    previousCommit,
    catalogActions,
    status: restartStatus,
    serviceUnit,
    port,
    branch,
    githubPayload,
  });
  return true;
}
