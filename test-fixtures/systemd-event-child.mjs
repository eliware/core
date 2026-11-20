import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

export default function createSystemdEventChild(jest) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = jest.fn(() => {
    child.killed = true;
    child.emit("close", 0);
  });
  child.killed = false;
  return child;
}
