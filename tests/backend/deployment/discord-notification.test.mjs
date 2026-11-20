import { expect, test } from "@jest/globals";
import createDeploymentDiscordNotification from "../../../src/backend/deployment/discord-notification.mjs";

test("builds a linked green embed for a successful GitHub push", () => {
  const commits = Array.from({ length: 13 }, (_, index) => ({
    id: `${String(index + 1).padStart(2, "0")}${"a".repeat(38)}`,
    message: `Change ${index + 1}\nDetails`,
    added: index === 0 ? ["etc/kea/new.conf"] : [],
    modified: index === 0 ? ["etc/kea/kea-dhcp4.conf"] : [],
    removed: index === 0 ? ["etc/kea/old.conf"] : [],
  }));
  const notification = createDeploymentDiscordNotification({
    status: "succeeded",
    runId: "5995326421453766656",
    branch: "main",
    githubPayload: {
      ref: "refs/heads/main",
      compare: "https://github.com/eliware/core2/compare/before...after",
      repository: { full_name: "eliware/core2" },
      commits,
      pusher: { name: "eli-sterling" },
    },
    startedAt: "2026-11-19T14:00:00.000Z",
    finishedAt: "2026-11-19T14:00:08.000Z",
    steps: [
      { name: "git pull", status: "passed" },
      { name: "git status after git pull", status: "passed", internal: true },
    ],
  });

  expect(notification).toMatchObject({
    title: "✅ Core deployment succeeded",
    color: 0x00ff00,
    url: "https://github.com/eliware/core2/compare/before...after",
    timestamp: "2026-11-19T14:00:08.000Z",
    author: { name: "eli-sterling", url: "https://github.com/eliware/core2" },
    footer: { text: "Core deployment · 5995326421453766656" },
    message: "Branch: **main**\nCommits: **13**",
  });
  expect(notification.fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "Deployment ID", value: "5995326421453766656" }),
      expect.objectContaining({
        name: "Commits (13)",
        value: expect.stringContaining("[01aaaaa](https://github.com/eliware/core2/commit/"),
      }),
      expect.objectContaining({ name: "New (1)", value: "etc/kea/new.conf" }),
      expect.objectContaining({ name: "Modified (1)", value: "etc/kea/kea-dhcp4.conf" }),
      expect.objectContaining({ name: "Deleted (1)", value: "etc/kea/old.conf" }),
      expect.objectContaining({ name: "Deployment steps", value: "✅ git pull" }),
      expect.objectContaining({ name: "Duration", value: "8 seconds" }),
    ]),
  );
  const commitsField = notification.fields.find(({ name }) => name === "Commits (13)");
  expect(commitsField.value).toContain("And 1 more commit.");
  expect(notification.fields.find(({ name }) => name === "Deployment steps").value).not.toContain(
    "git status",
  );
});

test("builds a red failure embed with fallbacks and safe text", () => {
  const notification = createDeploymentDiscordNotification({
    status: "failed",
    runId: "run-2",
    branch: "main",
    githubPayload: {
      ref: "",
      repository: { full_name: "invalid repository" },
      compare: "https://github.com/example/repo/compare/before...after",
      commits: [
        { id: "bad", message: "@everyone **bad**", added: [], modified: "bad", removed: [] },
      ],
    },
    failedStep: "npm test",
    error: "Tests failed.",
    recovery: "Previous commit restored.",
    startedAt: "2026-11-19T14:00:08.000Z",
    finishedAt: "2026-11-19T14:00:07.000Z",
    steps: [{ name: "npm test", status: "failed", detail: "Tests failed." }],
  });

  expect(notification).toMatchObject({
    title: "❌ Core deployment failed",
    color: 0xff0000,
    url: undefined,
    message: "Branch: **main**\nCommits: **1**",
  });
  expect(notification.author).toBeUndefined();
  expect(notification.fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "Repository", value: "Unknown repository" }),
      expect.objectContaining({ name: "Failure", value: "Failed at npm test.\nTests failed." }),
      expect.objectContaining({ name: "Recovery", value: "Previous commit restored." }),
      expect.objectContaining({ name: "Deployment steps", value: "❌ npm test: Tests failed." }),
    ]),
  );
  expect(notification.fields.find(({ name }) => name === "Commits (1)").value).toContain(
    "@\u200beveryone \\*\\*bad\\*\\*",
  );
});

test("uses the configured branch and default details when a push has no metadata", () => {
  const notification = createDeploymentDiscordNotification({
    status: "succeeded",
    branch: "release",
    githubPayload: { repository: { full_name: "eliware/core" } },
    steps: [{ status: "running" }],
  });

  expect(notification).toMatchObject({
    url: "https://github.com/eliware/core",
    message: "Branch: **release**\nCommits: **0**",
  });
  expect(notification.fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "Commits (0)", value: "No commit details were included." }),
      expect.objectContaining({ name: "Deployment steps", value: "⏳ Unknown step" }),
    ]),
  );
  expect(notification.fields.some(({ name }) => name === "Duration")).toBe(false);
});

test("formats missing commit details, file overflow, and incomplete failure details", () => {
  const notification = createDeploymentDiscordNotification({
    status: "failed",
    githubPayload: {
      ref: "refs/heads/feature/fix",
      repository: { full_name: "eliware/core" },
      compare: "https://example.com/compare/not-trusted",
      commits: [
        { message: "", added: Array.from({ length: 13 }, (_, index) => `new-${index}.conf`) },
        { id: 42, message: 42, modified: [], removed: [] },
      ],
      sender: { login: "@here" },
    },
    failedStep: "",
    error: "failure without a step",
    steps: [],
  });

  expect(notification.author).toEqual({
    name: "@\u200bhere",
    url: "https://github.com/eliware/core",
  });
  expect(notification.url).toBe("https://github.com/eliware/core");
  expect(notification.fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "Branch", value: "feature/fix" }),
      expect.objectContaining({
        name: "Commits (2)",
        value: "• Commit\n• Commit",
      }),
      expect.objectContaining({
        name: "New (13)",
        value: expect.stringContaining("And 1 more file."),
      }),
      expect.objectContaining({
        name: "Deployment steps",
        value: "No deployment steps were recorded.",
      }),
      expect.objectContaining({
        name: "Failure",
        value: "Deployment failed.\nfailure without a step",
      }),
    ]),
  );

  const pluralFiles = createDeploymentDiscordNotification({
    status: "succeeded",
    githubPayload: {
      commits: [{ added: Array.from({ length: 14 }, (_, index) => `extra-${index}.conf`) }],
    },
  });
  expect(pluralFiles.fields.find(({ name }) => name === "New (14)").value).toContain(
    "And 2 more files.",
  );
});

test("rejects compare links outside the exact GitHub repository path", () => {
  const notification = createDeploymentDiscordNotification({
    status: "succeeded",
    githubPayload: {
      repository: { full_name: "eliware/core" },
      compare: "https://github.com/eliware/core.evil/compare/before...after",
    },
  });

  expect(notification.url).toBe("https://github.com/eliware/core");
  const invalid = createDeploymentDiscordNotification({
    status: "succeeded",
    githubPayload: {
      repository: { full_name: "eliware/core" },
      compare: "not a URL",
    },
  });
  expect(invalid.url).toBe("https://github.com/eliware/core");
});

test("uses defaults when notification metadata is omitted", () => {
  const notification = createDeploymentDiscordNotification({ status: "succeeded" });

  expect(notification).toMatchObject({
    title: "✅ Core deployment succeeded",
    message: "Branch: **main**\nCommits: **0**",
    timestamp: undefined,
    footer: { text: "Core deployment · unknown" },
  });
  expect(notification.fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "Deployment ID", value: "unknown" }),
      expect.objectContaining({ name: "Commits (0)", value: "No commit details were included." }),
    ]),
  );
});

test("pluralizes omitted commit summaries and handles a null branch", () => {
  const notification = createDeploymentDiscordNotification({
    status: "succeeded",
    branch: null,
    githubPayload: {
      commits: Array.from({ length: 14 }, () => ({})),
    },
  });

  expect(notification.fields.find(({ name }) => name === "Branch").value).toBe("");
  expect(notification.fields.find(({ name }) => name === "Commits (14)").value).toContain(
    "And 2 more commits.",
  );
});
