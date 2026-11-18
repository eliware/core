import { parse as parseJsonc } from "jsonc-parser";

export default function normalizeKea(path, text) {
  if (path !== "etc/kea/kea-dhcp4.conf") return text;
  try {
    const config = parseJsonc(text);
    const ha = config.Dhcp4["hooks-libraries"].find(
      (item) => item.parameters?.["high-availability"],
    ).parameters["high-availability"][0];
    ha["this-server-name"] = "<local-server>";
    return JSON.stringify(config, null, 2);
  } catch {
    return text;
  }
}
