export default function parseAddressOptions(line) {
  const tokens = [];
  let token = "";
  let quote;
  let escaped = false;
  const finish = () => {
    if (token) tokens.push(token);
    token = "";
  };
  for (const character of line.trim()) {
    if (escaped) {
      token += character;
      escaped = false;
    } else if (quote && character === "\\") escaped = true;
    else if (quote && character === quote) quote = undefined;
    else if (quote) token += character;
    else if (character === '"' || character === "'") quote = character;
    else if (character === "#") break;
    else if (/\s/u.test(character)) finish();
    else token += character;
  }
  finish();
  return tokens;
}
