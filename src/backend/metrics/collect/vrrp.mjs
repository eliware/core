import summarizeVrrp from "../vrrp.mjs";
import collectVrrpSnapshot from "./vrrp-snapshot.mjs";

export default async function collectVrrp(metric, dependencies) {
  return summarizeVrrp(await collectVrrpSnapshot(metric, dependencies));
}
