import { createHash } from "node:crypto";
import * as defaultFileSystem from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import recoverStaleLock from "./stale-lock.mjs";

export default function acquireDeploymentLock(repositoryPath, options = {}) {
  const directory = options.directory ?? tmpdir();
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const processId = options.processId ?? process.pid;
  const key = createHash("sha256").update(resolve(repositoryPath)).digest("hex");
  const lockPath = join(directory, `eliware-deployment-${key}.lock`);
  const recoveryPath = `${lockPath}.recovery`;
  let descriptor;
  try {
    descriptor = fileSystem.openSync(lockPath, "wx", 0o600);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    recoverStaleLock(lockPath, recoveryPath, fileSystem, options.isProcessAlive);
    try {
      descriptor = fileSystem.openSync(lockPath, "wx", 0o600);
    } catch (error) {
      if (error.code === "EEXIST") throw new Error("Another deployment process is active.");
      throw error;
    }
  }
  try {
    fileSystem.writeFileSync(descriptor, String(processId));
  } catch (error) {
    try {
      fileSystem.closeSync(descriptor);
    } catch {}
    try {
      fileSystem.unlinkSync(lockPath);
    } catch {}
    throw error;
  }
  let descriptorClosed = false;
  let lockRemoved = false;
  return () => {
    if (lockRemoved) return;
    if (!descriptorClosed) {
      fileSystem.closeSync(descriptor);
      descriptorClosed = true;
    }
    fileSystem.unlinkSync(lockPath);
    lockRemoved = true;
  };
}
