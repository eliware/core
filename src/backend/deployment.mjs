import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import runDeploymentStep from "./deployment/step.mjs";
import recoverDeployment from "./deployment/recovery.mjs";
import createDeploymentStatus from "./deployment/status.mjs";

const execFile = promisify(nodeExecFile);

export default function createDeploymentManager({
  repositoryPath,
  branch = "main",
  notify = async () => {},
  run = (command, args, options) => execFile(command, args, { ...options, windowsHide: true }),
  recover = recoverDeployment,
  now = () => new Date(),
} = {}) {
  let active = false;
  const status = createDeploymentStatus({
    status: "idle",
    startedAt: null,
    finishedAt: null,
    steps: [],
  });

  async function execute(event, runId) {
    const startedAt = now().toISOString();
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
        onStart: (currentStep, priorSteps) => {
          status.update({
            currentStep,
            steps: structuredClone(priorSteps),
          });
        },
      });

    status.set({ runId, event, status: "running", startedAt, finishedAt: null, steps });
    try {
      const dirty = await run("git", ["status", "--porcelain"], { cwd: repositoryPath });
      if (String(dirty.stdout ?? "").trim())
        throw new Error("Configuration repository has uncommitted changes.");
      const revision = await run("git", ["rev-parse", "HEAD"], { cwd: repositoryPath });
      const commit = String(revision.stdout ?? "").trim();
      if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error("Git returned an invalid commit ID.");
      previousCommit = commit;
      await step("git pull", "git", ["pull", "--ff-only", "--", "origin", branch]);
      await step("npm ci", "npm", ["ci"]);
      await step("npm test", "npm", ["test"]);
      await step("npm run preflight", "npm", ["run", "preflight"]);
      reloadStarted = true;
      await step("npm run reload", "npm", ["run", "reload"]);
      try {
        await notify(`Core deployment ${runId} succeeded on ${branch}.`);
      } catch {
        status.update({ notificationError: "Discord notification failed." });
      }
      status.set({
        ...status.get(),
        runId,
        event,
        status: "succeeded",
        startedAt,
        finishedAt: now().toISOString(),
        steps,
      });
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
        error: String(error.message).slice(0, 300),
        recovery,
        startedAt,
        finishedAt: now().toISOString(),
        steps,
      });
      try {
        await notify(
          `Core deployment ${runId} failed at ${failedStep}.${recovery ? ` ${recovery}` : ""}`,
        );
      } catch {
        status.update({ notificationError: "Discord notification failed." });
      }
      return { accepted: true, runId };
    } finally {
      active = false;
    }
  }

  function start(event) {
    if (!repositoryPath) return { accepted: false, status: "unconfigured" };
    if (active) return { accepted: false, status: "busy" };
    active = true;
    const runId = randomUUID();
    void execute(event, runId)
      .catch(async (error) => {
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
      })
      .finally(() => {
        active = false;
      });
    return { accepted: true, runId };
  }

  return { start, getStatus: status.get };
}
