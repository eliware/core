function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function addTextElement(document, parent, tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

function renderHealth(document, data) {
  const list = document.querySelector("[data-health-list]");
  const empty = document.querySelector("[data-health-empty]");
  const summary = document.querySelector("[data-health-summary]");
  const dot = document.querySelector("[data-state-dot]");
  const checkedAt = document.querySelector("[data-checked-at]");
  if (!list || !data) return;

  list.replaceChildren();
  const health = data.health ?? { status: "unknown", units: [] };
  const states = {
    healthy: "All configured applications are healthy",
    unhealthy: "One or more applications need attention",
    unconfigured: "No applications are configured",
    unknown: "Health checks are pending",
  };
  if (summary) summary.textContent = states[health.status] ?? states.unknown;
  if (dot) dot.dataset.state = health.status ?? "unknown";
  if (checkedAt)
    checkedAt.textContent = health.checkedAt
      ? `Checked ${formatTime(health.checkedAt)}`
      : "Waiting for first check";
  if (empty) empty.hidden = health.units?.length > 0;

  for (const unit of health.units ?? []) {
    const item = document.createElement("li");
    item.className = "health-item";
    const indicator = addTextElement(document, item, "span", "health-indicator", "");
    indicator.dataset.state = unit.status ?? "unknown";
    addTextElement(document, item, "span", "health-name", unit.name ?? "Unknown application");
    addTextElement(
      document,
      item,
      "span",
      "health-detail",
      unit.detail ?? unit.status ?? "unknown",
    );
    addTextElement(document, item, "time", "health-time", formatTime(unit.checkedAt));
    list.append(item);
  }
}

function renderDeployment(document, deployment) {
  if (!deployment) return;
  const badge = document.querySelector("[data-deployment-state]");
  const started = document.querySelector("[data-deployment-start]");
  const current = document.querySelector("[data-deployment-step]");
  const result = document.querySelector("[data-deployment-result]");
  const list = document.querySelector("[data-step-list]");
  if (badge) {
    badge.textContent = deployment.status ?? "unknown";
    badge.dataset.state = deployment.status ?? "unknown";
  }
  if (started) started.textContent = formatTime(deployment.startedAt);
  if (current) current.textContent = deployment.currentStep ?? deployment.failedStep ?? "—";
  if (result)
    result.textContent =
      deployment.error ??
      deployment.recovery ??
      (deployment.status === "idle" ? "No deployment recorded." : (deployment.status ?? "unknown"));
  if (!list) return;
  list.replaceChildren();
  for (const step of deployment.steps ?? []) {
    if (step.internal) continue;
    const item = document.createElement("li");
    item.dataset.state = step.status ?? "unknown";
    addTextElement(document, item, "span", "step-name", step.name ?? "Unknown step");
    addTextElement(document, item, "span", "step-result", step.detail ?? step.status ?? "unknown");
    list.append(item);
  }
}

export default function renderHome(
  document,
  { fetcher = fetch, setIntervalFn = setInterval, now = () => new Date() } = {},
) {
  const status = document.querySelector("[data-status]");
  if (!document.querySelector("[data-health-list]")) {
    if (status) status.textContent = "Core dashboard assets loaded.";
    return undefined;
  }

  let refreshing = false;
  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const response = await fetcher("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error("Status request failed.");
      const data = await response.json();
      renderHealth(document, data);
      renderDeployment(document, data?.deployment);
      if (status) status.textContent = `Updated ${formatTime(now())}`;
    } catch {
      if (status) status.textContent = "Status is unavailable. Retrying shortly.";
    } finally {
      refreshing = false;
    }
  }

  void refresh();
  return setIntervalFn(() => void refresh(), 30_000);
}
