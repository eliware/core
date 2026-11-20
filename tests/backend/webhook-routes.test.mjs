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

function postWebhook(server, body, delivery) {
  return server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: signedHeaders(body, { "x-github-delivery": delivery }),
    payload: body,
  });
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
  expect(deployment.start).toHaveBeenCalledWith("delivery-1", { ref: "refs/heads/main" });
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
        .mockReturnValueOnce({ accepted: false, status: "busy" })
        .mockReturnValueOnce({ accepted: false, status: "busy" })
        .mockReturnValueOnce({ accepted: false, status: "busy" })
        .mockReturnValueOnce({ accepted: true, runId: "run-2" }),
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
  const acceptedRetry = await server.inject({
    method: "POST",
    url: "/api/github/webhook",
    headers: busyHeaders,
    payload: body,
  });
  expect(acceptedRetry.statusCode).toBe(202);
  expect(acceptedRetry.json()).toEqual({ accepted: true, runId: "run-2" });
  expect(deployment.start).toHaveBeenCalledTimes(5);
  await server.close();
});

test("bounds remembered busy GitHub request IDs", async () => {
  const body = JSON.stringify({ ref: "refs/heads/main" });
  const deployment = {
    start: jest.fn((id) =>
      id.startsWith("busy") ? { accepted: false, status: "busy" } : { accepted: true, runId: id },
    ),
  };
  const { server } = await setup({ deployment, maximumRememberedDeliveries: 1 });
  for (const id of ["accepted-1", "accepted-2"]) await postWebhook(server, body, id);
  for (const id of ["busy-1", "busy-2"]) await postWebhook(server, body, id);
  const duplicate = await postWebhook(server, body, "accepted-1");
  expect(duplicate.json()).toEqual({ accepted: true, runId: "accepted-1" });
  expect(deployment.start).toHaveBeenCalledTimes(5);
  await server.close();

  const busyDeployment = { start: jest.fn(() => ({ accepted: false, status: "busy" })) };
  const busyServer = await setup({ deployment: busyDeployment, maximumRememberedDeliveries: 1 });
  for (const id of ["busy-1", "busy-2"]) await postWebhook(busyServer.server, body, id);
  await postWebhook(busyServer.server, body, "busy-1");
  expect(busyDeployment.start).toHaveBeenCalledTimes(3);
  await busyServer.server.close();
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

test("bounds accepted delivery IDs and rejects duplicates while remembered", async () => {
  const body = JSON.stringify({ ref: "refs/heads/main" });
  const { server, deployment } = await setup({ maximumRememberedDeliveries: 2 });
  await postWebhook(server, body, "delivery-0");
  await postWebhook(server, body, "delivery-1");
  const duplicate = await postWebhook(server, body, "delivery-1");
  expect(duplicate.json()).toEqual({ accepted: false, reason: "duplicate delivery" });
  await postWebhook(server, body, "delivery-2");
  const expired = await postWebhook(server, body, "delivery-0");
  expect(expired.json()).toEqual({ accepted: true, runId: "run-1" });
  expect(deployment.start).toHaveBeenCalledTimes(4);
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

test.each([
  [undefined, '{"ref":"refs/heads/main"}', 415],
  ["text/plain", '{"ref":"refs/heads/main"}', 415],
  ["application/json", "null", 400],
  ["application/json", "[]", 400],
])(
  "rejects webhook payloads with invalid content types or shapes",
  async (contentType, body, code) => {
    const { server, deployment } = await setup();
    const response = await server.inject({
      method: "POST",
      url: "/api/github/webhook",
      headers: signedHeaders(body, { "content-type": contentType }),
      payload: body,
    });
    expect(response.statusCode).toBe(code);
    expect(deployment.start).not.toHaveBeenCalled();
    await server.close();
  },
);

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
