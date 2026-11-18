import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { createSnowflakeGenerator } from "@eliware/common";
import runDeploymentStep from "./deployment/step.mjs";
import recoverDeployment from "./deployment/recovery.mjs";
import createDeploymentStatus from "./deployment/status.mjs";
import acquireDeploymentLock from "./deployment/lock.mjs";
import reportSetupFailure from "./deployment/setup-failure.mjs";
import createDeploymentAdmission from "./deployment/admission.mjs";

const execFile = promisify(nodeExecFile);
export default function createDeploymentManager({
  repositoryPath,
  branch = "main",
  notify = async () => {},
  run = (command, args, options) => execFile(command, args, { ...options, windowsHide: true }),
  recover = recoverDeployment,
  now = () => new Date(),
  createRunId,
  snowflake = {},
  acquireLock = acquireDeploymentLock,
} = {}) {
  const status = createDeploymentStatus();
  const generateRunId = createRunId ?? createSnowflakeGenerator(snowflake);
  const admit = createDeploymentAdmission({
    repositoryPath,
    generateRunId,
    acquireLock,
    reportSetupFailure: (error, event, runId) =>
      reportSetupFailure({ error, event, runId, status, notify, now }),
  });
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
    }
  }
  function start(event) {
    return admit(event, execute);
  }
  return { start, getStatus: status.get };
}
