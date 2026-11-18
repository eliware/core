export default async function checkHealthUnit(name, checkUnit, now) {
  try {
    await checkUnit(name);
    return { name, status: "healthy", checkedAt: now().toISOString() };
  } catch (error) {
    return {
      name,
      status: "unhealthy",
      checkedAt: now().toISOString(),
      detail: error?.code === "ENOENT" ? "systemctl is unavailable" : "Unit is not active",
    };
  }
}
