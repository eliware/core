export default async function runDeploymentStep({
  name,
  command,
  args,
  repositoryPath,
  run,
  steps,
  onStart,
}) {
  onStart(name, steps);
  try {
    await run(command, args, {
      cwd: repositoryPath,
      timeout: 15 * 60_000,
      maxBuffer: 1024 * 1024,
    });
    steps.push({ name, status: "passed" });
  } catch (error) {
    steps.push({ name, status: "failed", detail: String(error?.message ?? error).slice(0, 300) });
    throw Object.assign(new Error(`${name} failed.`), { cause: error, stepName: name });
  }
}
