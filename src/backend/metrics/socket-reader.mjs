import { createConnection } from "node:net";

export default function readSocket(socketPath, timeoutMs, connect = createConnection) {
  return new Promise((resolve, reject) => {
    const socket = connect(socketPath);
    let output = "";
    const timeout = setTimeout(
      () => socket.destroy(new Error("HAProxy socket timed out")),
      timeoutMs,
    );
    socket.setEncoding("utf8");
    socket.on("connect", () => socket.end("show stat\n"));
    socket.on("data", (chunk) => {
      output += chunk;
    });
    socket.on("end", () => {
      clearTimeout(timeout);
      resolve(output);
    });
    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.on("close", () => clearTimeout(timeout));
  });
}
