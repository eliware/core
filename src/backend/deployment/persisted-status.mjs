import * as fileSystem from "node:fs";
import getPersistedStatusPaths from "./status-path.mjs";

export default function createPersistedStatus(repositoryPath, fs = fileSystem) {
  const paths = getPersistedStatusPaths(repositoryPath);
  return {
    load() {
      try {
        return paths ? JSON.parse(fs.readFileSync(paths.statusPath, "utf8")) : undefined;
      } catch {
        return undefined;
      }
    },
    save(status) {
      if (paths && fs.existsSync(paths.gitPath))
        fs.writeFileSync(paths.statusPath, JSON.stringify(status));
    },
  };
}
