import { expect, test } from "@jest/globals";
import parseSnowflakeOptions from "../../../src/backend/config/snowflake.mjs";

test("defaults the worker and process identity", () => {
  expect(parseSnowflakeOptions({})).toEqual({ workerId: 0 });
});

test("parses configured worker and process identities", () => {
  expect(parseSnowflakeOptions({ SNOWFLAKE_WORKER_ID: "7", SNOWFLAKE_PROCESS_ID: "11" })).toEqual({
    workerId: 7,
    processId: 11,
  });
});

test.each([
  ["SNOWFLAKE_WORKER_ID", "32"],
  ["SNOWFLAKE_PROCESS_ID", "-1"],
  ["SNOWFLAKE_PROCESS_ID", "not-an-integer"],
])("rejects invalid %s values", (name, value) => {
  expect(() => parseSnowflakeOptions({ [name]: value })).toThrow(name);
});
