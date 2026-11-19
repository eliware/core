export default function renderMetricSummary(document, content, values) {
  const summary = Object.entries(values.totals ?? values).filter(
    ([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value),
  );
  if (!summary.length) return;
  const row = document.createElement("p");
  row.className = "metric-summary";
  row.textContent = summary.map(([key, value]) => `${key}: ${value ?? "—"}`).join(" · ");
  content.append(row);
}
