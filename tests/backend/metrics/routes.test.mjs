import { expect, test } from "@jest/globals";
import summarizeRoutes from "../../../src/backend/metrics/routes.mjs";

test("summarizes active routes and default routes", () => {
  expect(
    summarizeRoutes([
      { dst: "default", gateway: "10.0.0.1", dev: "wan0", protocol: "static", metric: 10 },
      { dst: "10.0.0.0/24", dev: "lan0", protocol: "kernel", scope: "link" },
      {},
    ]),
  ).toMatchObject({
    totals: { routes: 3, defaultRoutes: 2, protocols: 2 },
    routes: [
      { destination: "default", gateway: "10.0.0.1", interface: "wan0", metric: 10 },
      { destination: "10.0.0.0/24", interface: "lan0", protocol: "kernel" },
      { destination: "default", gateway: null, interface: null },
    ],
  });
});
