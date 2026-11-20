import Fastify from "fastify";
import { resolve } from "node:path";
import { afterEach, expect, jest, test } from "@jest/globals";
import registerWebRoutes from "../../src/backend/http.mjs";

let server;

afterEach(async () => {
  if (server) await server.close();
  server = undefined;
});

function createServer(options = {}) {
  server = Fastify({
    logger: false,
    ajv: { customOptions: { removeAdditional: false } },
  });
  registerWebRoutes(server, {
    publicRoot: "public",
    buildRoot: "dist",
    ...options,
  });
  return server;
}

function createHandle(content = "asset") {
  return {
    stat: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
    readFile: jest.fn().mockResolvedValue(content),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

const resolvePath = async (file) => resolve(file);

test("serves the public page and packaged client asset", async () => {
  const handles = [createHandle(), createHandle()];
  const openFile = jest.fn().mockImplementation(() => Promise.resolve(handles.shift()));
  const app = createServer({
    openFile,
    statPath: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
    resolvePath,
  });

  const page = await app.inject({ method: "GET", url: "/" });
  expect(openFile).toHaveBeenCalledWith(resolve("public", "index.html"), "r");
  expect(page.statusCode).toBe(200);
  expect(page.headers["content-type"]).toContain("text/html");
  expect(page.body).toBe("asset");

  const client = await app.inject({ method: "GET", url: "/client.js" });
  expect(openFile).toHaveBeenLastCalledWith(resolve("public", "client.bundle"), "r");
  expect(client.statusCode).toBe(200);
  expect(client.headers["content-type"]).toContain("text/javascript");
  expect(client.body).toBe("asset");
});

test("rejects unsupported methods for registered asset routes", async () => {
  const app = createServer();
  const result = await app.inject({ method: "POST", url: "/" });
  expect(result.statusCode).toBe(405);
  expect(result.headers["content-type"]).toContain("text/plain");
  expect(result.body).toBe("Method not allowed");
});

test("returns not found for an unknown route and an unavailable asset", async () => {
  const error = Object.assign(new Error("missing"), { code: "ENOENT" });
  const openFile = jest.fn().mockRejectedValue(error);
  const app = createServer({ openFile, resolvePath });

  for (const url of ["/private", "/"]) {
    const result = await app.inject({ method: "GET", url });
    expect(result.statusCode).toBe(404);
    expect(result.headers["content-type"]).toContain("text/plain");
    expect(result.body).toBe("Not found");
  }
  expect(openFile).toHaveBeenCalledTimes(1);
});
