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

  if (args.length === 2 && args[0] === "compare" && args[1].length > 0) {
    return { type: "compare", partnerRepo: args[1] };
  }

  return { type: "unknown", argument: args[0] };
}
