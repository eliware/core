import { fileURLToPath } from "node:url";

const workerPath = fileURLToPath(new URL("../../../bin/core-restart-worker.mjs", import.meta.url));

export default async function scheduleCoreRestart({
  run,
  runId,
  repositoryPath,
  previousCommit,
  catalogActions,
  status,
  serviceUnit,
  port,
  branch,
  githubPayload,
}) {
  const payload = Buffer.from(
    JSON.stringify({
      repositoryPath,
      previousCommit,
      catalogActions,
      serviceUnit,
      port,
      branch,
      githubPayload,
      status,
    }),
  ).toString("base64url");
  await run(
    "systemd-run",
    [
      "--quiet",
      `--unit=eliware-core-restart-${runId}`,
      "--collect",
      "--property=Type=exec",
      `--property=WorkingDirectory=${repositoryPath}`,
      process.execPath,
      workerPath,
      payload,
    ],
    { cwd: repositoryPath, timeout: 30_000 },
  );
}
