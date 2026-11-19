export default function parseArguments(args) {
  if (args.length === 0 || (args.length === 1 && args[0] === "--help")) {
    return { type: "help" };
  }

  if (args.length === 1 && args[0] === "--version") {
    return { type: "version" };
  }

  if (args.length === 1 && args[0] === "preflight") {
    return { type: "preflight" };
  }

  if (args.length === 1 && args[0] === "catalog") {
    return { type: "catalog" };
  }

  if (args[0] === "status" || args[0] === "reload") {
    const parsed = parseOperationArguments(args.slice(1));
    return parsed.error ? { type: "invalid", command: args[0] } : { type: args[0], ...parsed };
  }

  if (args.length === 2 && args[0] === "compare" && args[1].length > 0) {
    return { type: "compare", partnerRepo: args[1] };
  }

  return { type: "unknown", argument: args[0] };
}

function parseOperationArguments(args) {
  let componentId;
  let repositoryPath;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--repo") {
      if (repositoryPath || !args[index + 1] || args[index + 1].startsWith("--"))
        return { error: true };
      repositoryPath = args[index + 1];
      index += 1;
    } else if (!args[index] || args[index].startsWith("-") || componentId) return { error: true };
    else componentId = args[index];
  }
  return { componentId, repositoryPath };
}
