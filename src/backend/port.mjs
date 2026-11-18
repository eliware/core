export default function parseTcpEndpoint(value) {
  const input = value ?? 9300;
  const validInput =
    typeof input === "number" || (typeof input === "string" && /^\d+$/u.test(input));
  const tcpEndpoint = validInput ? Number(input) : Number.NaN;
  if (!Number.isInteger(tcpEndpoint) || tcpEndpoint < 1 || tcpEndpoint > 65535) {
    throw new Error("Set the TCP endpoint value to an integer from 1 through 65535");
  }
  return tcpEndpoint;
}
