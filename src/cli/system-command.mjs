import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(nodeExecFile);

export default function runSystemCommand(command, args) {
  return execFile(command, args);
}
