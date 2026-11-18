import { expect, test } from "@jest/globals";
import validateText from "../../src/preflight/text.mjs";

test("validates chrony directives and argument counts", () => {
  expect(
    validateText("etc/chrony.conf", "pool time.example iburst\nallow 10.0.0.0/24\nmakestep 1 3\n"),
  ).toEqual([]);
  expect(
    validateText("etc/chrony.conf", "bad value\nallow\nserver\nmakestep 1\n").join(" "),
  ).toContain("unknown chrony directive");
});

test("validates HAProxy sections and references", () => {
  const valid =
    "global\n maxconn 100\ndefaults\n mode tcp\nfrontend web\n bind 0.0.0.0:443\n default_backend app\nbackend app\n server one 127.0.0.1:8080\n";
  expect(validateText("etc/haproxy/haproxy.cfg", valid)).toEqual([]);
  expect(
    validateText(
      "etc/haproxy/haproxy.cfg",
      "frontend web\n default_backend missing\nbackend empty\n",
    ).join(" "),
  ).toContain("backend missing is not defined");
  expect(
    validateText(
      "etc/haproxy/haproxy.cfg",
      "global\ndefaults\nfrontend web\n bind\nbackend app\n server bad bad\n",
    ).join(" "),
  ).toContain("server needs a valid address and port");
});

test("checks shell interpreters, quoted text, and control blocks", () => {
  expect(validateText("scripts/a.sh", "#!/bin/bash\nif true; then echo ok; fi\n")).toEqual([]);
  expect(validateText("scripts/a.sh", "echo 'open\n").join(" ")).toContain(
    "quoted string is not closed",
  );
  expect(validateText("scripts/a.sh", "#!/usr/bin/env bash\nif true; then\n").join(" ")).toContain(
    "unmatched if keyword",
  );
  expect(validateText("scripts/a.sh", "echo ok\n").join(" ")).toContain(
    "shell interpreter line is required",
  );
  expect(validateText("README.md", "")).toEqual([]);
});
