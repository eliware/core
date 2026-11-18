import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import runDeploymentStep from "./deployment/step.mjs";
import recoverDeployment from "./deployment/recovery.mjs";
import createDeploymentStatus from "./deployment/status.mjs";
import acquireDeploymentLock from "./deployment/lock.mjs";

const execFile = promisify(nodeExecFile);

export default function createDeploymentManager({
  repositoryPath,
  branch = "main",
  notify = async () => {},
  run = (command, args, options) => execFile(command, args, { ...options, windowsHide: true }),
  recover = recoverDeployment,
  now = () => new Date(),
  createRunId = randomUUID,
  acquireLock = acquireDeploymentLock,
} = {}) {
  let active = false;
  const status = createDeploymentStatus();
  async function execute(event, runId, releaseLock) {
    let startedAt;
    const steps = [];
    let previousCommit;
    let reloadStarted = false;
    const step = (name, command, args) =>
      runDeploymentStep({
        name,
        command,
        args,
        repositoryPath,
        run,
        steps,
        onStart: (currentStep, priorSteps) =>
          status.update({ currentStep, steps: structuredClone(priorSteps) }),
      });
    try {
      startedAt = now().toISOString();
      status.set({ runId, event, status: "running", startedAt, finishedAt: null, steps });
      const dirty = await run("git", ["status", "--porcelain"], { cwd: repositoryPath });
      if (String(dirty.stdout ?? "").trim())
        throw new Error("Configuration repository has uncommitted changes.");
      const revision = await run("git", ["rev-parse", "HEAD"], { cwd: repositoryPath });
      const commit = String(revision.stdout ?? "").trim();
      if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error("Git returned an invalid commit ID.");
      previousCommit = commit;
      await step("git pull", "git", ["pull", "--ff-only", "--", "origin", branch]);
      await step("npm ci --include=dev", "npm", ["ci", "--include=dev"]);
      await step("npm test", "npm", ["test"]);
      await step("npm run preflight", "npm", ["run", "preflight"]);
      reloadStarted = true;
      await step("npm run reload", "npm", ["run", "reload"]);
      status.set({
        ...status.get(),
        runId,
        event,
        status: "succeeded",
        startedAt,
        finishedAt: now().toISOString(),
        steps,
      });
      releaseLock?.();
      active = false;
      try {
        await notify(`Core deployment ${runId} succeeded on ${branch}.`);
      } catch {
        status.update({ notificationError: "Discord notification failed." });
      }
      return { accepted: true, runId };
    } catch (error) {
      const failedStep = error.stepName ?? "repository check";
      let recovery;
      if (previousCommit) {
        try {
          recovery = await recover({ run, repositoryPath, previousCommit, reloadStarted, steps });
        } catch (recoveryError) {
          recovery = `Recovery failed: ${String(recoveryError?.message ?? recoveryError).slice(0, 200)}`;
          steps.push({ name: "restore previous commit", status: "failed" });
        }
      }
      status.set({
        runId,
        event,
        status: "failed",
        failedStep,
        error: String(error?.message ?? error).slice(0, 300),
        recovery,
        startedAt,
        finishedAt: now().toISOString(),
        steps,
      });
      releaseLock?.();
      active = false;
      try {
        await notify(
          `Core deployment ${runId} failed at ${failedStep}.${recovery ? ` ${recovery}` : ""}`,
        );
      } catch {
        status.update({ notificationError: "Discord notification failed." });
      }
      return { accepted: true, runId };
    } finally {
      releaseLock?.();
      active = false;
    }
  }
  function start(event) {
    if (!repositoryPath) return { accepted: false, status: "unconfigured" };
    if (active) return { accepted: false, status: "busy" };
    let runId;
    try {
      runId = createRunId();
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
    void execute(event, runId, releaseLock).catch(async (error) => {
      active = false;
      const failure = String(error?.message ?? error).slice(0, 300);
      status.set({
        runId,
        event,
        status: "failed",
        error: failure,
        startedAt: status.get().startedAt,
        finishedAt: status.timestamp(() => now().toISOString(), status.get().startedAt),
        steps: status.get().steps,
      });
      try {
        await notify(`Core deployment ${runId} failed at deployment setup. ${failure}`);
      } catch {
        status.update({ notificationError: "Discord notification failed." });
      }
    });
    return { accepted: true, runId };
  }
  return { start, getStatus: status.get };
}
