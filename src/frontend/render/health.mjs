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

export default function renderHealth(document, data) {
  const list = document.querySelector("[data-health-list]");
  const empty = document.querySelector("[data-health-empty]");
  const summary = document.querySelector("[data-health-summary]");
  const dot = document.querySelector("[data-state-dot]");
  const checkedAt = document.querySelector("[data-checked-at]");
  if (!list || !data) return;

  list.replaceChildren();
  const health = data.health ?? { status: "unknown", units: [] };
  const metrics = data.metrics?.components ?? [];
  const overall =
    health.status === "unhealthy" || metrics.some(({ status }) => status === "unhealthy")
      ? "unhealthy"
      : metrics.some(({ status }) => status === "unavailable")
        ? "unavailable"
        : metrics.some(({ status }) => status === "unknown")
          ? "unknown"
          : health.status === "healthy" || (health.status === "unconfigured" && metrics.length > 0)
            ? "healthy"
            : health.status;
  const states = {
    healthy: "All available router checks are healthy",
    unhealthy: "One or more router checks need attention",
    unavailable: "Some router data is unavailable",
    unconfigured: "No systemd applications are configured",
    unknown: "Router checks are pending",
  };
  if (summary) summary.textContent = states[overall] ?? states.unknown;
  if (dot) dot.dataset.state = overall ?? "unknown";
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
      unit.detail ?? unit.state ?? unit.status ?? "unknown",
    );
    addTextElement(document, item, "time", "health-time", formatTime(unit.checkedAt));
    list.append(item);
  }
}
