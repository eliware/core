export default function isBalanced(text, pair = "{}") {
  const [open, close] = pair;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (const char of text) {
    if (escaped) escaped = false;
    else if (char === "\\" && quote) escaped = true;
    else if (quote && char === quote) quote = "";
    else if (!quote && (char === '"' || char === "'")) quote = char;
    else if (!quote && char === open) depth += 1;
    else if (!quote && char === close && --depth < 0) return false;
  }
  return !quote && depth === 0;
}
