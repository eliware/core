export default async function verifyDeploymentWorktree({
  afterStep,
  repositoryPath,
  run,
  steps,
  onStart,
}) {
  const name = `git status after ${afterStep}`;
  const result = { name, status: "running", internal: true };
  steps.push(result);
  onStart(afterStep, steps);
  try {
    const worktree = await run("git", ["status", "--porcelain"], { cwd: repositoryPath });
    const exitCode = worktree?.code ?? worktree?.exitCode ?? worktree?.status;
    if (exitCode !== undefined && exitCode !== 0)
      throw new Error(`Git status exited with code ${exitCode}.`);
    if (String(worktree.stdout ?? "").trim())
      throw new Error(`Configuration repository has uncommitted changes after ${afterStep}.`);
    result.status = "passed";
  } catch (error) {
    result.status = "failed";
    result.detail = String(error?.message ?? error).slice(0, 300);
    onStart(afterStep, steps);
    throw Object.assign(new Error(`Repository check after ${afterStep} failed: ${result.detail}`), {
      cause: error,
      stepName: afterStep,
    });
  }
}
