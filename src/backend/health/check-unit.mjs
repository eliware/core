export default async function checkHealthUnit(name, checkUnit, now) {
  let checkedAt;
  try {
    checkedAt = now().toISOString();
  } catch {
    checkedAt = null;
  }
  try {
    await checkUnit(name);
    return { name, status: "healthy", checkedAt };
  } catch (error) {
    return {
      name,
      status: "unhealthy",
      checkedAt,
      detail: error?.code === "ENOENT" ? "systemctl is unavailable" : "Unit is not active",
    };
  }
}
