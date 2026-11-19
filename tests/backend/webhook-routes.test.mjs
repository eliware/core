import { createHmac } from "node:crypto";
import { expect, jest, test } from "@jest/globals";
import createWebServer from "../../src/backend/server.mjs";
import registerWebhookRoutes from "../../src/backend/webhook-routes.mjs";

const secret = "webhook-secret";

function signedHeaders(body, overrides = {}) {
  return Object.fromEntries(
    Object.entries({
      "content-type": "application/json",
      "x-hub-signature-256": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
      "x-github-event": "push",
      "x-github-delivery": "delivery-1",
      ...overrides,
    }).filter(([, value]) => value !== undefined),
  );
}

async function setup({
  enabled = true,
  configuredSecret = secret,
  branch,
  maximumRememberedDeliveries,
  deployment = { start: jest.fn(() => ({ accepted: true, runId: "run-1" })) },
} = {}) {
  const server = createWebServer();
  registerWebhookRoutes(server, {
    secret: configuredSecret,
    deployment,
    ...(maximumRememberedDeliveries ? { maximumRememberedDeliveries } : {}),
    ...(branch ? { branch } : {}),
    ...(enabled === false ? { enabled } : {}),
  });
  await server.ready();
  return { server, deployment };
}

test("accepts a signed push to the configured branch", async () => {
  const body = JSON.stringify({ ref: "refs/heads/main" });
  const { server, deployment } = await setup();
  const response = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body),
    payload: body,
  });
  expect(response.statusCode).toBe(202);
  expect(response.json()).toEqual({ accepted: true, runId: "run-1" });
  expect(deployment.start).toHaveBeenCalledWith("delivery-1");
  await server.close();
});

test("rejects bad signatures and handles missing webhook configuration", async () => {
  const body = JSON.stringify({ ref: "refs/heads/main" });
  const invalid = await setup();
  const bad = await invalid.server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body, { "x-hub-signature-256": "bad" }),
    payload: body,
  });
  expect(bad.statusCode).toBe(401);
  await invalid.server.close();

  const disabled = await setup({ enabled: false });
  const missing = await disabled.server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body),
    payload: body,
  });
  expect(missing.statusCode).toBe(503);
  await disabled.server.close();

  const noSecret = await setup({ configuredSecret: "" });
  const unconfigured = await noSecret.server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body),
    payload: body,
  });
  expect(unconfigured.statusCode).toBe(503);
  await noSecret.server.close();
});

test.each([
  ["ping", "refs/heads/main", "delivery-2", 202],
  ["push", "refs/heads/other", "delivery-3", 202],
  ["push", "refs/heads/main", undefined, 400],
])("ignores unsupported event or branch %s %s", async (event, ref, delivery, expectedCode) => {
  const body = JSON.stringify({ ref });
  const { server, deployment } = await setup();
  const response = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body, { "x-github-event": event, "x-github-delivery": delivery }),
    payload: body,
  });
  expect(response.statusCode).toBe(expectedCode);
  expect(deployment.start).not.toHaveBeenCalled();
  await server.close();
});

test("rejects duplicate deliveries and busy deployment requests", async () => {
  const body = JSON.stringify({ ref: "refs/heads/main" });
  const { server, deployment } = await setup({
    deployment: {
      start: jest
        .fn()
        .mockReturnValueOnce({ accepted: true, runId: "run-1" })
        .mockReturnValueOnce({ accepted: false, status: "busy" }),
    },
  });
  const headers = signedHeaders(body);
  const first = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers,
    payload: body,
  });
  expect(first.statusCode).toBe(202);
  const duplicate = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers,
    payload: body,
  });
  expect(duplicate.json().reason).toBe("duplicate delivery");
  const busyHeaders = signedHeaders(body, { "x-github-delivery": "delivery-2" });
  const second = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: busyHeaders,
    payload: body,
  });
  expect(second.statusCode).toBe(409);
  const busyDuplicate = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: busyHeaders,
    payload: body,
  });
  expect(busyDuplicate.statusCode).toBe(409);
  expect(busyDuplicate.json()).toEqual({ accepted: false, status: "busy" });
  const busyRetry = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: busyHeaders,
    payload: body,
  });
  expect(busyRetry.statusCode).toBe(409);
  expect(busyRetry.json()).toEqual({ accepted: false, status: "busy" });
  expect(deployment.start).toHaveBeenCalledTimes(2);
  await server.close();
});

test("bounds remembered busy GitHub request IDs", async () => {
  const body = JSON.stringify({ ref: "refs/heads/main" });
  const deployment = { start: jest.fn(() => ({ accepted: false, status: "busy" })) };
  const { server } = await setup({ deployment, maximumRememberedDeliveries: 1 });
  for (const id of ["busy-1", "busy-2"])
    await server.inject({
      method: "POST",
      url: "/api/github/webhook",
      headers: signedHeaders(body, { "x-github-delivery": id }),
      payload: body,
    });
  await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body, { "x-github-delivery": "busy-1" }),
    payload: body,
  });
  expect(deployment.start).toHaveBeenCalledTimes(3);
  await server.close();
});

test("returns unavailable when deployment admission cannot start", async () => {
  const body = JSON.stringify({ ref: "refs/heads/main" });
  const deployment = { start: jest.fn(() => ({ accepted: false, status: "unavailable" })) };
  const { server } = await setup({ deployment });
  const response = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body),
    payload: body,
  });
  expect(response.statusCode).toBe(503);
  await server.close();
});

test("rejects oversized delivery IDs and bounds remembered deliveries", async () => {
  const body = JSON.stringify({ ref: "refs/heads/main" });
  const { server, deployment } = await setup();
  const oversized = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body, { "x-github-delivery": "x".repeat(101) }),
    payload: body,
  });
  expect(oversized.statusCode).toBe(400);
  for (let index = 0; index < 1001; index += 1) {
    const response = await server.inject({
      method: "POST",
      url: "/api/github/webhook",
      headers: signedHeaders(body, { "x-github-delivery": `delivery-${index}` }),
      payload: body,
    });
    expect(response.statusCode).toBe(202);
  }
  const duplicate = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body, { "x-github-delivery": "delivery-0" }),
    payload: body,
  });
  expect(duplicate.statusCode).toBe(202);
  expect(deployment.start).toHaveBeenCalledTimes(1002);
  const recentDuplicate = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body, { "x-github-delivery": "delivery-1000" }),
    payload: body,
  });
  expect(recentDuplicate.json()).toEqual({ accepted: false, reason: "duplicate delivery" });
  expect(deployment.start).toHaveBeenCalledTimes(1002);
  await server.close();
});

test("rejects invalid JSON payloads", async () => {
  const { server } = await setup();
  const response = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders("{"),
    payload: "{",
  });
  expect(response.statusCode).toBe(400);
  await server.close();
});

test("rejects webhook requests that exceed the body limit", async () => {
  const { server, deployment } = await setup();
  const body = `{"ref":"refs/heads/main","data":"${"x".repeat(1024 * 1024)}"}`;
  const response = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body),
    payload: body,
  });
  expect(response.statusCode).toBe(413);
  expect(deployment.start).not.toHaveBeenCalled();
  await server.close();
});
