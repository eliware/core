import { expect, test } from "@jest/globals";
import renderMetricSummary from "../../../src/frontend/metrics/summary.mjs";

function element() {
  return {
    children: [],
    append(child) {
      this.children.push(child);
    },
  };
}

const document = { createElement: (tag) => Object.assign(element(), { tag }) };

test("renders scalar totals as a summary row", () => {
  const content = element();
  renderMetricSummary(document, content, { totals: { peers: 2, synced: true, absent: null } });
  expect(content.children[0]).toMatchObject({
    tag: "p",
    className: "metric-summary",
    textContent: "peers: 2 · synced: true · absent: —",
  });
});

test("omits summaries with no scalar fields", () => {
  const content = element();
  renderMetricSummary(document, content, { totals: { nested: {} } });
  expect(content.children).toEqual([]);
});
