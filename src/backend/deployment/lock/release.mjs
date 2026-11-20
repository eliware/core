export default function releaseDeploymentLock({ releaseLock, status }) {
  try {
    releaseLock?.();
  } catch {
    status.update({ lockReleaseError: "Deployment lock cleanup failed." });
  }
}
