import { expect, test } from "@jest/globals";
import renderMetricDetails from "../../src/frontend/metrics-details.mjs";

function element() {
  return {
    children: [],
    append(child) {
      this.children.push(child);
    },
  };
}

const document = { createElement: (tag) => Object.assign(element(), { tag }) };

test("renders metric summaries and detail rows", () => {
  const content = element();
  renderMetricDetails(document, content, {
    totals: { peers: 2, synced: true },
    peers: [{ name: "edge", state: "up" }],
  });
  expect(content.children[0].textContent).toBe("peers: 2 · synced: true");
  expect(content.children[1].children[1].children[0].textContent).toBe("name: edge · state: up");
});

test("omits empty groups and bounds large detail lists", () => {
  const content = element();
  renderMetricDetails(document, content, {
    empty: [],
    routes: Array.from({ length: 101 }, (_value, index) => ({ prefix: `route-${index}` })),
  });
  const details = content.children[0].children[1].children;
  expect(details).toHaveLength(101);
  expect(details.at(-1).textContent).toBe("Showing 100 of 101 entries");
});
