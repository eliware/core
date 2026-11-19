export default function recoverStaleLock(
  lockPath,
  recoveryPath,
  fileSystem,
  isProcessAlive = defaultIsProcessAlive,
) {
  let owner;
  try {
    owner = Number(fileSystem.readFileSync(lockPath, "utf8"));
  } catch {
    throw new Error("A deployment lock exists and cannot be read.");
  }
  if (!Number.isInteger(owner) || owner < 1) throw new Error("A deployment lock has invalid data.");
  if (isProcessAlive(owner)) throw new Error("Another deployment process is active.");

  let recoveryDescriptor;
  try {
    recoveryDescriptor = fileSystem.openSync(recoveryPath, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error("Another deployment process is recovering a stale lock.");
    throw error;
  }
  try {
    const currentOwner = Number(fileSystem.readFileSync(lockPath, "utf8"));
    if (currentOwner !== owner || isProcessAlive(currentOwner))
      throw new Error("Another deployment process is active.");
    fileSystem.unlinkSync(lockPath);
  } finally {
    try {
      fileSystem.closeSync(recoveryDescriptor);
    } finally {
      fileSystem.unlinkSync(recoveryPath);
    }
  }
}

function defaultIsProcessAlive(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}
