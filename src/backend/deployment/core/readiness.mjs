export default async function checkCoreReadiness({
  port,
  serviceUnit,
  run,
  fetcher,
  pause,
  now,
  timeoutMs,
}) {
  const startedAt = now();
  let lastError;
  while (now() - startedAt < timeoutMs) {
    try {
      await run("systemctl", ["is-active", "--quiet", serviceUnit]);
      const response = await fetcher(`http://127.0.0.1:${port}/ready`);
      if (response.status === 200) return;
      lastError = new Error(`Core readiness returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await pause();
  }
  throw new Error(`Core did not become healthy after restart: ${lastError?.message ?? "timeout"}`);
}
