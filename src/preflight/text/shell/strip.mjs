export default function stripShellText(text) {
  let result = "";
  let quote = "";
  let escaped = false;
  let comment = false;
  for (const char of text) {
    if (char === "\n") {
      comment = false;
      result += "\n";
      continue;
    }
    if (comment) result += " ";
    else if (escaped) {
      escaped = false;
      result += " ";
    } else if (quote && char === "\\" && quote !== "'") {
      escaped = true;
      result += " ";
    } else if (quote && char === quote) {
      quote = "";
      result += " ";
    } else if (!quote && ["'", '"', "`"].includes(char)) {
      quote = char;
      result += " ";
    } else if (!quote && char === "#") {
      comment = true;
      result += " ";
    } else result += quote ? " " : char;
  }
  return result;
}
