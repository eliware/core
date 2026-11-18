export default async function verifyDeploymentWorktree({
  afterStep,
  repositoryPath,
  run,
  steps,
  onStart,
}) {
  const name = `git status after ${afterStep}`;
  const result = { name, status: "running" };
  steps.push(result);
  onStart(name, steps);
  try {
    const worktree = await run("git", ["status", "--porcelain"], { cwd: repositoryPath });
    if (String(worktree.stdout ?? "").trim())
      throw new Error("Configuration repository has uncommitted changes.");
    result.status = "passed";
  } catch (error) {
    result.status = "failed";
    result.detail = String(error?.message ?? error).slice(0, 300);
    onStart(name, steps);
    throw Object.assign(new Error(`${name} failed.`), { cause: error, stepName: name });
  }
}
