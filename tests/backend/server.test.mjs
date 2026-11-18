import { expect, jest, test } from "@jest/globals";

const createServer = jest.fn();
const server = {
  removeContentTypeParser: jest.fn(),
  addContentTypeParser: jest.fn(),
};
createServer.mockReturnValue(server);
jest.unstable_mockModule("fastify", () => ({ default: createServer }));
const createWebServer = (await import("../../src/backend/server.mjs")).default;

test("creates Fastify with the application server options", () => {
  createWebServer();

  expect(createServer).toHaveBeenCalledWith({
    logger: false,
    ajv: { customOptions: { removeAdditional: false } },
  });
  expect(server.removeContentTypeParser).toHaveBeenCalledWith("application/json");
  expect(server.addContentTypeParser).toHaveBeenCalledWith(
    "application/json",
    { parseAs: "buffer" },
    expect.any(Function),
  );
});

test("retains raw JSON bytes and rejects malformed JSON", () => {
  createWebServer();
  const parser = server.addContentTypeParser.mock.calls.at(-1)[2];
  const request = {};
  parser(request, Buffer.from('{"ok":true}'), (error, result) => {
    expect(error).toBeNull();
    expect(request.rawBody).toEqual(Buffer.from('{"ok":true}'));
    expect(result).toEqual({ ok: true });
  });
  parser(request, Buffer.from("{"), (error) => {
    expect(error.statusCode).toBe(400);
  });
});
