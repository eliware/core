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

export default function renderDeployment(document, deployment) {
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
