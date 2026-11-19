import { expect, test } from "@jest/globals";
import renderDeployment from "../../../src/frontend/render/deployment.mjs";

function element() {
  return {
    dataset: {},
    children: [],
    append(child) {
      this.children.push(child);
    },
    replaceChildren() {
      this.children = [];
    },
  };
}

function dashboard() {
  const elements = Object.fromEntries(
    ["badge", "started", "current", "result", "list"].map((name) => [name, element()]),
  );
  return {
    elements,
    querySelector: (selector) =>
      ({
        "[data-deployment-state]": elements.badge,
        "[data-deployment-start]": elements.started,
        "[data-deployment-step]": elements.current,
        "[data-deployment-result]": elements.result,
        "[data-step-list]": elements.list,
      })[selector] ?? null,
    createElement: (tag) => Object.assign(element(), { tag }),
  };
}

test("renders deployment details and skips internal steps", () => {
  const document = dashboard();
  renderDeployment(document, {
    status: "failed",
    startedAt: "2026-11-18T12:00:00.000Z",
    failedStep: "npm test",
    error: "Tests failed.",
    steps: [
      { name: "npm test", status: "failed", detail: "Tests failed." },
      { name: "git status", status: "passed", internal: true },
    ],
  });
  expect(document.elements.badge.dataset.state).toBe("failed");
  expect(document.elements.current.textContent).toBe("npm test");
  expect(document.elements.result.textContent).toBe("Tests failed.");
  expect(document.elements.list.children).toHaveLength(1);
});

test("uses safe defaults for incomplete and idle deployment data", () => {
  const document = dashboard();
  renderDeployment(document, { status: "idle", steps: [{}] });
  expect(document.elements.badge.textContent).toBe("idle");
  expect(document.elements.started.textContent).toBe("—");
  expect(document.elements.current.textContent).toBe("—");
  expect(document.elements.result.textContent).toBe("No deployment recorded.");
  expect(document.elements.list.children[0].children.map(({ textContent }) => textContent)).toEqual(
    ["Unknown step", "unknown"],
  );
});

test("uses recovery text, failed step, and unknown status values", () => {
  const document = dashboard();
  renderDeployment(document, { recovery: "Previous commit restored.", failedStep: "npm ci" });
  expect(document.elements.badge.dataset.state).toBe("unknown");
  expect(document.elements.current.textContent).toBe("npm ci");
  expect(document.elements.result.textContent).toBe("Previous commit restored.");
});

test("uses invalid timestamps and defaults for unknown deployments", () => {
  const document = dashboard();
  renderDeployment(document, { startedAt: "invalid", currentStep: "fetch", status: "running" });
  expect(document.elements.started.textContent).toBe("—");
  expect(document.elements.current.textContent).toBe("fetch");
  expect(document.elements.result.textContent).toBe("running");
  expect(document.elements.list.children).toEqual([]);
});

test("uses unknown text when a deployment has no status", () => {
  const document = dashboard();
  renderDeployment(document, { steps: [] });
  expect(document.elements.result.textContent).toBe("unknown");
});

test("tolerates an absent deployment or step list", () => {
  const document = dashboard();
  renderDeployment(document, null);
  const noList = { querySelector: () => null };
  renderDeployment(noList, { status: "passed" });
});
