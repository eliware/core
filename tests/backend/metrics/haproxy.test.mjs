import { expect, test } from "@jest/globals";
import parseHaproxyStats from "../../../src/backend/metrics/haproxy.mjs";

test("summarizes HAProxy server health and counters", () => {
  const data =
    "# pxname,svname,status,scur,stot,bin,bout,econ,eresp\nweb,server1,UP,2,12,100,200,0,1\nweb,BACKEND,UP,2,12,100,200,0,1\n";
  expect(parseHaproxyStats(data)).toMatchObject({
    totals: { backends: 1, servers: 1, up: 1, sessions: 2, bytesIn: 100, errors: 1 },
    backends: [{ name: "web", state: "UP" }],
  });
  expect(
    parseHaproxyStats(
      "# pxname,svname,status,scur,stot,bin,bout,econ,eresp\napi,node,DOWN,bad,1,0,0,0,0\napi,BACKEND,DOWN,bad,1,0,0,0,0\n",
    ),
  ).toMatchObject({ totals: { down: 1, sessions: 0 }, backends: [{ sessions: 0 }] });
  expect(() => parseHaproxyStats("")).toThrow("no statistics");
  expect(parseHaproxyStats("# pxname,svname,status\napi,node\n").totals).toMatchObject({
    up: 0,
    down: 0,
  });
});
