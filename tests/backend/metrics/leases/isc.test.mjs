import { expect, test } from "@jest/globals";
import countIscLeases from "../../../../src/backend/metrics/leases/isc.mjs";

test("counts the latest active unexpired ISC lease for each address", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const source = [
    "lease 10.0.0.2 { starts 4 2026/11/19 11:00:00; ends 4 2026/11/19 13:00:00; binding state active; }",
    "lease 10.0.0.3 { ends 4 2026/11/19 11:00:00; binding state active; }",
    "lease 10.0.0.4 { binding state active; }",
    "lease 10.0.0.5 { ends 4 2026/11/19 13:00:00; binding state free; }",
    "lease 10.0.0.2 { starts 4 2026/11/19 10:00:00; binding state free; }",
  ].join("\n");
  expect(countIscLeases(source, now)).toBe(1);
});

test("uses lease start times when duplicate addresses appear out of order", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const source =
    "lease 10.0.0.2 { starts 4 2026/11/19 10:00:00; binding state free; }\nlease 10.0.0.2 { starts 4 2026/11/19 11:00:00; ends 4 2026/11/19 13:00:00; binding state active; }\nlease 10.0.0.2 { starts 4 2026/11/19 09:00:00; binding state free; }";
  expect(countIscLeases(source, now)).toBe(1);
});

test("uses the newest free lease when its start time is later", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const source =
    "lease 10.0.0.2 { starts 4 2026/11/19 11:00:00; ends 4 2026/11/19 13:00:00; binding state active; }\nlease 10.0.0.2 { starts 4 2026/11/19 12:30:00; binding state free; }";
  expect(countIscLeases(source, now)).toBe(0);
});

test("handles missing and invalid lease timestamps", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const source =
    "lease 10.0.0.2 { binding state free; }\nlease 10.0.0.2 { ends 4 invalid; binding state free; }\nlease 10.0.0.2 { starts 4 2026/11/19 11:00:00; ends 4 2026/11/19 13:00:00; binding state active; }";
  expect(countIscLeases(source, now)).toBe(1);
});
