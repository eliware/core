import { expect, test } from "@jest/globals";
import escapeMarkdown from "../../../../src/backend/deployment/notification/escape.mjs";

test.each([
  [null, ""],
  ["@everyone @here", "@\u200beveryone @\u200bhere"],
  ["\\_*~`>|", "\\\\\\_\\*\\~\\`\\>\\|"],
])("escapes notification text %s", (value, expected) => {
  expect(escapeMarkdown(value)).toBe(expected);
});
