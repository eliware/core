import { expect, test } from "@jest/globals";
import validateSystemd from "../../../src/preflight/structured/systemd.mjs";

test("checks unit sections, settings, and local script references", () => {
  const files = ["scripts/start.sh"];
  const valid =
    "[Unit]\nDescription=Start app\n[Service]\nType=oneshot\nExecStart=/eliware/core1/scripts/start.sh\n";
  expect(validateSystemd("etc/systemd/system/app.service", valid, files)).toEqual([]);
  expect(
    validateSystemd(
      "etc/systemd/system/app.service",
      "[Unit]\n[Service]\nExecStartPre=a\nExecStartPre=b\n",
      files,
    ),
  ).toEqual([]);
  expect(
    validateSystemd(
      "etc/systemd/system/app.service",
      "[Unit]\n[Service]\nFoo=1\nFoo=2\n",
      files,
    ).join(" "),
  ).toContain("duplicate Foo setting");
  expect(
    validateSystemd("etc/systemd/system/app.service", "key without equals\n", files).join(" "),
  ).toContain("expected a section");
  expect(
    validateSystemd(
      "etc/systemd/system/app.service",
      "[Unit]\n[Service]\nExecStart=/eliware/core1/scripts/missing.sh\n",
      files,
    ).join(" "),
  ).toContain("referenced scripts/missing.sh file is missing");
  expect(
    validateSystemd("etc/systemd/system/app.service.d/extra.conf", "[Service]\n", files),
  ).toEqual([]);
  expect(
    validateSystemd("etc/systemd/system/app.timer", "[Unit]\n[Timer]\nOnBootSec=1m\n", files),
  ).toEqual([]);
  expect(
    validateSystemd("etc/systemd/system/app.service.d/empty.conf", "", files).join(" "),
  ).toContain("drop-in needs a unit section");
});
