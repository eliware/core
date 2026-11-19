import escapeMarkdown from "./escape.mjs";

export default function formatSteps(steps) {
  const visibleSteps = steps.filter((step) => !step.internal);
  if (!visibleSteps.length) return "No deployment steps were recorded.";
  return visibleSteps
    .map((step) => {
      const icon = step.status === "passed" ? "✅" : step.status === "failed" ? "❌" : "⏳";
      const detail = step.detail ? `: ${escapeMarkdown(step.detail)}` : "";
      return `${icon} ${escapeMarkdown(step.name || "Unknown step")}${detail}`;
    })
    .join("\n");
}
