export default function validateDashboardUrl(value, port) {
  if (!value) return `http://127.0.0.1:${port}/`;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CORE_DASHBOARD_URL must be a valid HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("CORE_DASHBOARD_URL must be a public HTTP or HTTPS URL without credentials.");
  return url.toString();
}
