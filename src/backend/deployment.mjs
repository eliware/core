import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

const execFile = promisify(nodeExecFile);

export default function createDeploymentManager({
  repositoryPath,
  branch = "main",
  notify = async () => {},
  run = (command, args, options) => execFile(command, args, { ...options, windowsHide: true }),
  now = () => new Date(),
} = {}) {
  let active = false;
  let latest = { status: "idle", startedAt: null, finishedAt: null, steps: [] };

  function getStatus() {
    return structuredClone(latest);
  }

  async function execute(event, runId) {
    const startedAt = now().toISOString();
    const steps = [];
    let previousCommit;
    let reloadStarted = false;

    async function step(name, command, args) {
      latest = { ...latest, currentStep: name, steps: structuredClone(steps) };
      try {
        await run(command, args, {
          cwd: repositoryPath,
          timeout: 15 * 60_000,
          maxBuffer: 1024 * 1024,
        });
        steps.push({ name, status: "passed" });
      } catch (error) {
        steps.push({
          name,
          status: "failed",
          detail: String(error?.message ?? error).slice(0, 300),
        });
        throw Object.assign(new Error(`${name} failed.`), { cause: error, stepName: name });
      }
    }

    latest = { runId, event, status: "running", startedAt, finishedAt: null, steps };
    try {
      const dirty = await run("git", ["status", "--porcelain"], { cwd: repositoryPath });
      if (String(dirty.stdout ?? "").trim())
        throw new Error("Configuration repository has uncommitted changes.");
      const revision = await run("git", ["rev-parse", "HEAD"], { cwd: repositoryPath });
      const commit = String(revision.stdout ?? "").trim();
      if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error("Git returned an invalid commit ID.");
      previousCommit = commit;
      await step("git pull", "git", ["pull", "--ff-only", "origin", branch]);
      await step("npm ci", "npm", ["ci"]);
      await step("npm test", "npm", ["test"]);
      await step("npm run preflight", "npm", ["run", "preflight"]);
      reloadStarted = true;
      await step("npm run reload", "npm", ["run", "reload"]);
      try {
        await notify(`Core deployment ${runId} succeeded on ${branch}.`);
      } catch {
        latest = { ...latest, notificationError: "Discord notification failed." };
      }
      latest = {
        ...latest,
        runId,
        event,
        status: "succeeded",
        startedAt,
        finishedAt: now().toISOString(),
        steps,
      };
      return { accepted: true, runId };
    } catch (error) {
      const failedStep = error.stepName ?? "repository check";
      let recovery;
      if (previousCommit) {
        try {
          await run("git", ["reset", "--hard", previousCommit], { cwd: repositoryPath });
          steps.push({ name: "restore previous commit", status: "passed" });
          if (reloadStarted) {
            try {
              await run("npm", ["run", "reload"], {
                cwd: repositoryPath,
                timeout: 15 * 60_000,
                maxBuffer: 1024 * 1024,
              });
              steps.push({ name: "reload previous configuration", status: "passed" });
            } catch (reloadError) {
              steps.push({
                name: "reload previous configuration",
                status: "failed",
                detail: String(reloadError?.message ?? reloadError).slice(0, 300),
              });
              recovery = "Previous commit restored, but its reload failed.";
            }
          }
        } catch (restoreError) {
          recovery = `Previous commit restore failed: ${String(restoreError?.message ?? restoreError).slice(0, 200)}`;
          steps.push({ name: "restore previous commit", status: "failed" });
        }
      }
      latest = {
        runId,
        event,
        status: "failed",
        failedStep,
        error: String(error.message).slice(0, 300),
        recovery,
        startedAt,
        finishedAt: now().toISOString(),
        steps,
      };
      try {
        await notify(
          `Core deployment ${runId} failed at ${failedStep}.${recovery ? ` ${recovery}` : ""}`,
        );
      } catch {
        latest.notificationError = "Discord notification failed.";
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
    void execute(event, runId).catch((error) => {
      latest = {
        runId,
        event,
        status: "failed",
        error: String(error?.message ?? error).slice(0, 300),
        startedAt: latest.startedAt,
        finishedAt: now().toISOString(),
        steps: latest.steps,
      };
      active = false;
    });
    return { accepted: true, runId };
  }

  return { start, getStatus };
}
