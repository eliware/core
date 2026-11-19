export default async function validateDeploymentRepository({ run, repositoryPath, branch }) {
  const options = { cwd: repositoryPath };
  const dirty = await run("git", ["status", "--porcelain"], options);
  const dirtyCode = dirty?.code ?? dirty?.exitCode ?? dirty?.status;
  if (dirtyCode !== undefined && dirtyCode !== 0)
    throw new Error(`Git status exited with code ${dirtyCode}.`);
  if (String(dirty.stdout ?? "").trim())
    throw new Error("Configuration repository has uncommitted changes.");

  const branchResult = await run("git", ["branch", "--show-current"], options);
  const branchCode = branchResult?.code ?? branchResult?.exitCode ?? branchResult?.status ?? 0;
  if (branchCode !== 0) throw new Error(`git branch exited with code ${branchCode}.`);
  if (String(branchResult.stdout ?? "").trim() !== branch)
    throw new Error(`Configuration repository must be on branch ${branch}.`);

  const revision = await run("git", ["rev-parse", "HEAD"], options);
  const revisionCode = revision?.code ?? revision?.exitCode ?? revision?.status ?? 0;
  const commit = String(revision.stdout ?? "").trim();
  if (revisionCode !== 0 || !/^[a-f0-9]{40,64}$/u.test(commit))
    throw new Error("Git returned an invalid commit ID.");
  return commit;
}
