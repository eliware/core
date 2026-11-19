function parseIdentityPart(value, name) {
  if (value === undefined) throw new Error(`Set ${name} to an integer from 0 through 31.`);
  const normalized = value.trim();
  if (!/^(0|[1-9][0-9]*)$/u.test(normalized)) {
    throw new Error(`Set ${name} to an integer from 0 through 31.`);
  }
  const parsed = Number(normalized);
  if (parsed > 31) throw new Error(`Set ${name} to an integer from 0 through 31.`);
  return parsed;
}

export default function parseSnowflakeOptions(environment) {
  return {
    workerId: parseIdentityPart(environment.SNOWFLAKE_WORKER_ID, "SNOWFLAKE_WORKER_ID"),
    processId: parseIdentityPart(environment.SNOWFLAKE_PROCESS_ID, "SNOWFLAKE_PROCESS_ID"),
  };
}
