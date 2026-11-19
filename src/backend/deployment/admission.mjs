export default function createDeploymentAdmission({
  repositoryPath,
  generateRunId,
  acquireLock,
  reportSetupFailure,
}) {
  let active = false;
  let pendingRelease;
  return function admit(event, execute, githubPayload) {
    if (!repositoryPath) return { accepted: false, status: "unconfigured" };
    if (active) return { accepted: false, status: "busy" };
    if (pendingRelease) {
      try {
        pendingRelease();
      } catch {
        return { accepted: false, status: "busy" };
      }
    }
    let runId;
    try {
      runId = generateRunId();
    } catch {
      return { accepted: false, status: "unavailable" };
    }
    let releaseLock;
    try {
      releaseLock = acquireLock(repositoryPath);
    } catch (error) {
      return {
        accepted: false,
        status: error?.message?.includes("deployment process is active") ? "busy" : "unavailable",
      };
    }
    active = true;
    let released = false;
    const release = () => {
      if (released) return;
      try {
        releaseLock?.();
        released = true;
        active = false;
        pendingRelease = undefined;
      } catch (error) {
        active = false;
        pendingRelease = release;
        throw error;
      }
    };
    void execute(event, runId, release, githubPayload)
      .catch(async (error) => {
        try {
          release();
        } catch {
          // Preserve setup failure reporting when lock cleanup also fails.
        }
        await reportSetupFailure(error, event, runId, githubPayload);
      })
      .catch(() => {});
    return { accepted: true, runId };
  };
}
