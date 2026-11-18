import { config } from "dotenv";

export default function loadEnvironment() {
  config({ quiet: true });
}
