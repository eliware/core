import parseChronyTracking from "../../ntp.mjs";

export default async function collectNtp({ run, timeoutMs }) {
  const { stdout } = await run("chronyc", ["-n", "tracking"], { timeout: timeoutMs });
  return parseChronyTracking(stdout);
}
