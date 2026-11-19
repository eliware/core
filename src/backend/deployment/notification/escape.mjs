export default function escapeMarkdown(value) {
  return String(value ?? "")
    .replace(/[\\_*~`>|]/gu, "\\$&")
    .replace(/@(everyone|here)\b/giu, "@\u200b$1");
}
