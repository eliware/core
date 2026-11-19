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
  const recoveryPath = `${lockPath}.recovery`;
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
    let recoveryDescriptor;
    try {
      recoveryDescriptor = fileSystem.openSync(recoveryPath, "wx", 0o600);
    } catch (recoveryError) {
      if (recoveryError.code === "EEXIST")
        throw new Error("Another deployment process is recovering a stale lock.");
      throw recoveryError;
    }
    try {
      const currentOwner = Number(fileSystem.readFileSync(lockPath, "utf8"));
      if (currentOwner !== owner || isProcessAlive(currentOwner))
        throw new Error("Another deployment process is active.");
      fileSystem.unlinkSync(lockPath);
    } finally {
      fileSystem.closeSync(recoveryDescriptor);
      fileSystem.unlinkSync(recoveryPath);
    }
    descriptor = fileSystem.openSync(lockPath, "wx", 0o600);
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

function defaultIsProcessAlive(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}
