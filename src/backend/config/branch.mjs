export default function validateBranch(value = "main") {
  if (
    !/^[a-zA-Z0-9_][a-zA-Z0-9._-]*(\/[a-zA-Z0-9_][a-zA-Z0-9._-]*)*$/u.test(value) ||
    value.includes("..")
  )
    throw new Error("CORE_GITHUB_BRANCH must be a valid branch name.");
  return value;
}
