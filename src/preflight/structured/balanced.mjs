export default function isBalanced(text, pair = "{}") {
  const [open, close] = pair;
  const opening = new Set(["{", "[", "(", open]);
  const closing = new Map([
    ["}", "{"],
    ["]", "["],
    [")", "("],
    [close, open],
  ]);
  const stack = [];
  let quote = "";
  let comment = false;
  let escaped = false;
  for (const char of text) {
    if (comment) {
      if (char === "\n") comment = false;
    } else if (escaped) escaped = false;
    else if (char === "\\" && quote) escaped = true;
    else if (quote && char === quote) quote = "";
    else if (!quote && (char === '"' || char === "'")) quote = char;
    else if (!quote && char === "#") comment = true;
    else if (!quote && opening.has(char)) stack.push(char);
    else if (!quote && closing.has(char) && stack.pop() !== closing.get(char)) return false;
  }
  return !quote && stack.length === 0;
}
