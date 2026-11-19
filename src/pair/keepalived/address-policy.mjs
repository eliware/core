import { isIP } from "node:net";

export default function isUsableVirtualAddress(value) {
  const [address, prefix] = value.split("/");
  const bits = Number(prefix);
  return (
    isIP(address) === 4 &&
    Number.isInteger(bits) &&
    bits >= 0 &&
    bits <= 32 &&
    isUsableHostAddress(address, bits)
  );
}

function isUsableHostAddress(address, prefix) {
  if (prefix >= 31) return true;
  const value = address.split(".").reduce((result, octet) => (result << 8n) | BigInt(octet), 0n);
  const hostBits = BigInt(32 - prefix);
  const blockSize = 1n << hostBits;
  const network = (value / blockSize) * blockSize;
  const broadcast = network + blockSize - 1n;
  return value !== network && value !== broadcast;
}
