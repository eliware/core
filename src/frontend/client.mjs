import renderMetrics from "./render/metrics.mjs";
import renderHealth from "./render/health.mjs";
import renderDeployment from "./render/deployment.mjs";
import createClientStatus from "./client/status.mjs";

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function renderHome(
  document,
  { fetcher = fetch, setIntervalFn = setInterval, now = () => new Date() } = {},
) {
  const status = document.querySelector("[data-status]");
  const clientStatus = createClientStatus(document, status);
  if (!clientStatus.canRender) return undefined;

  let refreshing = false;
  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const response = await fetcher("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error("Status request failed.");
      const data = await response.json();
      renderHealth(document, data);
      renderMetrics(document, data?.metrics);
      renderDeployment(document, data?.deployment);
      if (status) status.textContent = `Updated ${formatTime(now())}`;
    } catch {
      clientStatus.showUnavailable();
    } finally {
      refreshing = false;
    }
  }

  void refresh();
  return setIntervalFn(() => void refresh(), 30_000);
}
