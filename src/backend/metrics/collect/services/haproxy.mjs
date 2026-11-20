import parseHaproxyStats from "../../haproxy.mjs";
import readSocket from "../../socket-reader.mjs";

export default async function collectHaproxy(metric, { socket, connect, timeoutMs }) {
  const output = await (connect
    ? readSocket(metric.socketPath, timeoutMs, connect)
    : socket(metric.socketPath, timeoutMs));
  return parseHaproxyStats(output);
}
