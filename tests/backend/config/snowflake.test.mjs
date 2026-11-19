import { expect, test } from "@jest/globals";
import parseSnowflakeOptions from "../../../src/backend/config/snowflake.mjs";

test("requires explicit worker and process identities", () => {
  expect(() => parseSnowflakeOptions({})).toThrow("SNOWFLAKE_WORKER_ID");
  expect(() => parseSnowflakeOptions({ SNOWFLAKE_WORKER_ID: "1" })).toThrow("SNOWFLAKE_PROCESS_ID");
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
  expect(() =>
    parseSnowflakeOptions({ SNOWFLAKE_WORKER_ID: "1", SNOWFLAKE_PROCESS_ID: "1", [name]: value }),
  ).toThrow(name);
});
