import stripShellText from "./shell/strip.mjs";

export default function validateShell(file, text) {
  const errors = [];
  let quote = "";
  let escaped = false;
  for (const line of text.split(/\r?\n/u)) {
    for (const char of line) {
      if (escaped) escaped = false;
      else if (char === "\\" && quote !== "'") escaped = true;
      else if (quote && char === quote) quote = "";
      else if (!quote && (char === "'" || char === '"' || char === "`")) quote = char;
    }
  }
  if (quote) errors.push(`FAIL ${file}: quoted string is not closed.`);
  if (!/^#!(?:\/usr\/bin\/env\s+)?(?:\/bin\/)?(?:ba)?sh\b/mu.test(text))
    errors.push(`FAIL ${file}: a shell interpreter line is required.`);
  const structural = stripShellText(text);
  const stack = [];
  for (const token of structural.match(/\b(?:if|fi|for|while|until|select|done|case|esac)\b/gu) ??
    []) {
    if (["if", "for", "while", "until", "select", "case"].includes(token)) stack.push(token);
    else {
      const expected = { fi: "if", done: ["for", "while", "until", "select"], esac: "case" }[token];
      if (Array.isArray(expected) ? !expected.includes(stack.pop()) : stack.pop() !== expected)
        errors.push(`FAIL ${file}: unmatched ${token} keyword.`);
    }
  }
  for (const token of stack) errors.push(`FAIL ${file}: unmatched ${token} keyword.`);
  return errors;
}
