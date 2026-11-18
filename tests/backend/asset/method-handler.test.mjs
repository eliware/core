import { expect, jest, test } from "@jest/globals";
import createAssetMethodHandler from "../../../src/backend/asset/method-handler.mjs";

function createReply() {
  return {
    code: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
}

test.each([
  ["GET", true],
  ["POST", false],
])("handles %s requests according to the asset method policy", (method, allowed) => {
  const handler = jest.fn().mockReturnValue("asset response");
  const handle = createAssetMethodHandler(handler);
  const reply = createReply();

  expect(handle({ method, url: "/" }, reply)).toBe(allowed ? "asset response" : reply);
  expect(handler).toHaveBeenCalledTimes(allowed ? 1 : 0);
  if (!allowed) {
    expect(reply.code).toHaveBeenCalledWith(405);
    expect(reply.type).toHaveBeenCalledWith("text/plain");
    expect(reply.send).toHaveBeenCalledWith("Method not allowed");
  }
});
