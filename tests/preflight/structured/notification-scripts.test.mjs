import { expect, test } from "@jest/globals";
import validateNotificationScripts from "../../../src/preflight/structured/notification-scripts.mjs";

test("checks notification scripts in Keepalived instances", () => {
  const body = "notify_master /etc/keepalived/missing.sh\nnotify_backup /usr/bin/true";
  expect(validateNotificationScripts("keepalived.conf", body, [])).toEqual([
    "FAIL keepalived.conf: referenced etc/keepalived/missing.sh script is missing.",
  ]);
});

test("accepts a tracked notification script", () => {
  expect(
    validateNotificationScripts("keepalived.conf", "notify_stop /eliware/router/bin/stop.sh", [
      "bin/stop.sh",
    ]),
  ).toEqual([]);
});
