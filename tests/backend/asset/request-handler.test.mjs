import { expect, jest, test } from "@jest/globals";
import { resolve } from "node:path";
import createAssetRequestHandler from "../../../src/backend/asset/request-handler.mjs";

const resolvePath = async (file) => resolve(file);

function createHandle(content = "client asset") {
  return {
    stat: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
    readFile: jest.fn().mockResolvedValue(content),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

function createReply() {
  return {
    code: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
}

test("resolves an asset request path without its query string", async () => {
  const handle = createHandle();
  const openFile = jest.fn().mockResolvedValue(handle);
  const requestHandler = createAssetRequestHandler({
    publicRoot: "public",
    buildRoot: "dist",
    openFile,
    statPath: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
    resolvePath,
  });
  const reply = createReply();

  await requestHandler({ method: "GET", url: "/client.js?cache=1" }, reply);

  expect(openFile).toHaveBeenCalledWith(resolve("dist", "client.js"), "r");
  expect(reply.type).toHaveBeenCalledWith("text/javascript");
  expect(reply.send).toHaveBeenCalledWith("client asset");
});

test("returns not found for an unknown asset path", async () => {
  const openFile = jest.fn();
  const requestHandler = createAssetRequestHandler({
    publicRoot: "public",
    buildRoot: "dist",
    openFile,
  });
  const reply = createReply();

  await requestHandler({ method: "GET", url: "/private" }, reply);

  expect(openFile).not.toHaveBeenCalled();
  expect(reply.code).toHaveBeenCalledWith(404);
  expect(reply.send).toHaveBeenCalledWith("Not found");
});
