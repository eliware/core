import { expect, test } from "@jest/globals";
import countIscLeases from "../../../../src/backend/metrics/leases/isc.mjs";

test("counts the latest active unexpired ISC lease for each address", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const source = [
    "lease 10.0.0.2 { ends 4 2026/11/19 13:00:00; binding state active; }",
    "lease 10.0.0.3 { ends 4 2026/11/19 11:00:00; binding state active; }",
    "lease 10.0.0.4 { binding state active; }",
    "lease 10.0.0.5 { ends 4 2026/11/19 13:00:00; binding state free; }",
    "lease 10.0.0.2 { binding state free; }",
  ].join("\n");
  expect(countIscLeases(source, now)).toBe(0);
});

test("keeps one active duplicate address when its latest lease is active", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const source =
    "lease 10.0.0.2 { binding state free; }\nlease 10.0.0.2 { ends 4 2026/11/19 13:00:00; binding state active; }";
  expect(countIscLeases(source, now)).toBe(1);
});
