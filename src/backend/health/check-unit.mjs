export default async function checkHealthUnit(name, checkUnit, now, timeoutMs = 10_000) {
  let checkedAt;
  try {
    checkedAt = now().toISOString();
  } catch {
    checkedAt = null;
  }
  let timer;
  try {
    await Promise.race([
      checkUnit(name),
      new Promise((resolve, reject) => {
        timer = setTimeout(
          () => reject(Object.assign(new Error("Unit check timed out"), { code: "ETIMEDOUT" })),
          timeoutMs,
        );
      }),
    ]);
    return { name, status: "healthy", checkedAt };
  } catch (error) {
    return {
      name,
      status: "unhealthy",
      checkedAt,
      detail:
        error?.code === "ENOENT"
          ? "systemctl is unavailable"
          : error?.code === "ETIMEDOUT"
            ? "Unit check timed out"
            : "Unit is not active",
    };
  } finally {
    clearTimeout(timer);
  }
}
