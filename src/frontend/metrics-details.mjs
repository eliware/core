function addTextElement(document, parent, tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

export default function renderMetricDetails(document, content, values) {
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
