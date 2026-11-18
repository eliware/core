function parseIdentityPart(value, fallback, name) {
  if (value === undefined) return fallback;
  const normalized = value.trim();
  if (!/^(0|[1-9][0-9]*)$/u.test(normalized)) {
    throw new Error(`Set ${name} to an integer from 0 through 31.`);
  }
  const parsed = Number(normalized);
  if (parsed > 31) throw new Error(`Set ${name} to an integer from 0 through 31.`);
  return parsed;
}

export default function parseSnowflakeOptions(environment) {
  const options = {
    workerId: parseIdentityPart(environment.SNOWFLAKE_WORKER_ID, 0, "SNOWFLAKE_WORKER_ID"),
  };
  if (environment.SNOWFLAKE_PROCESS_ID !== undefined) {
    options.processId = parseIdentityPart(
      environment.SNOWFLAKE_PROCESS_ID,
      undefined,
      "SNOWFLAKE_PROCESS_ID",
    );
  }
  return options;
}
