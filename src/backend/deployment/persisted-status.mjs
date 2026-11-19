import * as fileSystem from "node:fs";
import { join } from "node:path";

export default function createPersistedStatus(repositoryPath, fs = fileSystem) {
  const path = repositoryPath
    ? join(repositoryPath, ".git", "eliware-core-deployment-status.json")
    : undefined;
  return {
    load() {
      try {
        return path ? JSON.parse(fs.readFileSync(path, "utf8")) : undefined;
      } catch {
        return undefined;
      }
    },
    save(status) {
      if (path && fs.existsSync(join(repositoryPath, ".git")))
        fs.writeFileSync(path, JSON.stringify(status));
    },
  };
}
