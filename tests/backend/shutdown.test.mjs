import { expect, jest, test } from "@jest/globals";
import createShutdownHook from "../../src/backend/shutdown.mjs";

test("closes the server and logs once when shutdown repeats", async () => {
  const server = { close: jest.fn().mockResolvedValue(undefined) };
  const log = { info: jest.fn() };
  const shutdown = createShutdownHook({ server, log });

  await shutdown();
  await shutdown();

  expect(server.close).toHaveBeenCalledTimes(1);
  expect(log.info).toHaveBeenCalledTimes(1);
  expect(log.info).toHaveBeenCalledWith("Web application stopped");
});

test("retries shutdown after the server close fails", async () => {
  const error = new Error("close failed");
  const server = {
    close: jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined),
  };
  const log = { info: jest.fn() };
  const shutdown = createShutdownHook({ server, log });

  await expect(shutdown()).rejects.toBe(error);
  await shutdown();
  await shutdown();

  expect(server.close).toHaveBeenCalledTimes(2);
  expect(log.info).toHaveBeenCalledTimes(1);
});

test("shares an in-flight server close", async () => {
  let finishClose;
  const closePromise = new Promise((resolve) => {
    finishClose = resolve;
  });
  const server = { close: jest.fn(() => closePromise) };
  const log = { info: jest.fn() };
  const shutdown = createShutdownHook({ server, log });

  const firstShutdown = shutdown();
  const secondShutdown = shutdown();
  await Promise.resolve();
  await Promise.resolve();
  expect(server.close).toHaveBeenCalledTimes(1);

  finishClose();
  await Promise.all([firstShutdown, secondShutdown]);

  expect(log.info).toHaveBeenCalledTimes(1);
});

test("stops health polling and skips a webhook listener that never opened", async () => {
  const server = { close: jest.fn().mockResolvedValue(undefined) };
  const webhookServer = {
    server: { listening: false },
    close: jest.fn(),
  };
  const stopHealthMonitor = jest.fn();
  const shutdown = createShutdownHook({
    server,
    webhookServer,
    log: { info: jest.fn() },
    stopHealthMonitor,
  });
  await shutdown();
  expect(stopHealthMonitor).toHaveBeenCalledTimes(1);
  expect(server.close).toHaveBeenCalledTimes(1);
  expect(webhookServer.close).not.toHaveBeenCalled();
});

test("does not close listeners that failed before opening", async () => {
  const server = { close: jest.fn() };
  const webhookServer = { close: jest.fn() };
  const shutdown = createShutdownHook({
    server,
    webhookServer,
    log: { info: jest.fn() },
    isListening: () => false,
  });
  await shutdown();
  expect(server.close).not.toHaveBeenCalled();
  expect(webhookServer.close).not.toHaveBeenCalled();
});

test("ignores close errors after a failed listener has stopped", async () => {
  const server = {
    server: { listening: false },
    close: jest.fn().mockRejectedValue(new Error("server was not running")),
  };
  const shutdown = createShutdownHook({
    server,
    log: { info: jest.fn() },
    isListening: () => true,
  });

  await expect(shutdown()).resolves.toBeUndefined();
  expect(server.close).toHaveBeenCalledTimes(1);
});
