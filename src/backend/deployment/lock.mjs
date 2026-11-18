import { createHash } from "node:crypto";
import * as defaultFileSystem from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export default function acquireDeploymentLock(repositoryPath, options = {}) {
  const directory = options.directory ?? tmpdir();
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const processId = options.processId ?? process.pid;
  const isProcessAlive = options.isProcessAlive ?? defaultIsProcessAlive;
  const key = createHash("sha256").update(resolve(repositoryPath)).digest("hex");
  const lockPath = join(directory, `eliware-deployment-${key}.lock`);
  let descriptor;
  try {
    descriptor = fileSystem.openSync(lockPath, "wx", 0o600);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    let owner;
    try {
      owner = Number(fileSystem.readFileSync(lockPath, "utf8"));
    } catch {
      throw new Error("A deployment lock exists and cannot be read.");
    }
    if (!Number.isInteger(owner) || owner < 1)
      throw new Error("A deployment lock has invalid data.");
    if (isProcessAlive(owner)) throw new Error("Another deployment process is active.");
    fileSystem.unlinkSync(lockPath);
    descriptor = fileSystem.openSync(lockPath, "wx", 0o600);
  }
  fileSystem.writeFileSync(descriptor, String(processId));
  let released = false;
  return () => {
    if (released) return;
    released = true;
    fileSystem.closeSync(descriptor);
    fileSystem.unlinkSync(lockPath);
  };
}

function defaultIsProcessAlive(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}
