import { join } from "node:path";

export default function getPersistedStatusPaths(repositoryPath) {
  if (!repositoryPath) return undefined;
  const gitPath = join(repositoryPath, ".git");
  return { gitPath, statusPath: join(gitPath, "eliware-core-deployment-status.json") };
}
