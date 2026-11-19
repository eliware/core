import { createConnection } from "node:net";

export default function readSocket(socketPath, timeoutMs, connect = createConnection) {
  return new Promise((resolve, reject) => {
    const socket = connect(socketPath);
    let output = "";
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve(value);
    };
    const timeout = setTimeout(() => {
      const error = new Error("HAProxy socket timed out");
      socket.destroy(error);
      finish(error);
    }, timeoutMs);
    socket.setEncoding("utf8");
    socket.on("connect", () => socket.end("show stat\n"));
    socket.on("data", (chunk) => {
      output += chunk;
    });
    socket.on("end", () => {
      finish(undefined, output);
    });
    socket.on("error", (error) => {
      finish(error);
    });
    socket.on("close", () => finish(new Error("HAProxy socket closed before response completed")));
  });
}
