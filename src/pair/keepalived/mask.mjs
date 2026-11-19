export default function maskCommentsAndStrings(text) {
  const chars = [...text];
  let quote;
  let comment = false;
  let escaped = false;
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    if (comment) {
      if (char === "\n") comment = false;
      else chars[index] = " ";
    } else if (quote) {
      chars[index] = char === "\n" ? "\n" : " ";
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
    } else if (char === "#") {
      chars[index] = " ";
      comment = true;
    } else if (char === '"' || char === "'") {
      chars[index] = " ";
      quote = char;
    }
  }
  return chars.join("");
}
