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

export default function renderMetrics(document, metrics) {
  const list = document.querySelector("[data-metrics-list]");
  const empty = document.querySelector("[data-metrics-empty]");
  const checkedAt = document.querySelector("[data-metrics-checked-at]");
  if (!list) return;
  const components = metrics?.components ?? [];
  list.replaceChildren();
  if (empty) empty.hidden = components.length > 0;
  if (checkedAt)
    checkedAt.textContent = metrics?.checkedAt
      ? `Updated ${formatTime(metrics.checkedAt)}`
      : "Waiting for first check";
  for (const component of components) {
    const item = document.createElement("li");
    item.className = "health-item metric-item";
    const indicator = addTextElement(document, item, "span", "health-indicator", "");
    indicator.dataset.state = component.status ?? "unknown";
    const content = document.createElement("div");
    content.className = "metric-content";
    addTextElement(
      document,
      content,
      "strong",
      "health-name",
      component.name ?? "Unknown component",
    );
    addTextElement(
      document,
      content,
      "span",
      "health-detail",
      component.detail ?? component.type ?? "Metric unavailable",
    );
    addTextElement(document, content, "time", "health-time", formatTime(component.checkedAt));
    if (component.values) renderValues(document, content, component.values);
    item.append(content);
    list.append(item);
  }
}

function renderValues(document, content, values) {
  const summary = Object.entries(values.totals ?? values).filter(
    ([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value),
  );
  if (summary.length) {
    const row = addTextElement(document, content, "p", "metric-summary", "");
    row.textContent = summary.map(([key, value]) => `${key}: ${value ?? "—"}`).join(" · ");
  }
  const groups = Object.entries(values).filter(([, value]) => Array.isArray(value));
  for (const [name, rows] of groups) {
    if (!rows.length) continue;
    const group = document.createElement("section");
    group.className = "metric-group";
    addTextElement(document, group, "strong", "metric-group-title", name);
    const details = document.createElement("ul");
    details.className = "metric-details";
    for (const value of rows.slice(0, 100)) {
      const detail = document.createElement("li");
      detail.textContent = Object.entries(value)
        .filter(([, field]) => field !== null && field !== undefined)
        .map(([key, field]) => `${key}: ${Array.isArray(field) ? field.join(", ") : field}`)
        .join(" · ");
      details.append(detail);
    }
    if (rows.length > 100) {
      const detail = document.createElement("li");
      detail.textContent = `Showing 100 of ${rows.length} entries`;
      details.append(detail);
    }
    group.append(details);
    content.append(group);
  }
}
