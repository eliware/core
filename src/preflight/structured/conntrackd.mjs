import isBalanced from "./balanced.mjs";

export default function validateConntrackd(file, text) {
  return isBalanced(text) && /\bSync\s*\{/u.test(text) && /\bGeneral\s*\{/u.test(text)
    ? []
    : [`FAIL ${file}: Sync and General blocks must be balanced and present.`];
}
