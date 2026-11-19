export default function runCompareCommand(parsed, { cwd, compareCommand }) {
  return compareCommand(cwd, parsed.partnerRepo);
}
