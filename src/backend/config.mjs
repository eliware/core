import loadApplicationSettings from "./config/application.mjs";
import loadApplicationEnvironment from "./config/environment.mjs";

export default function loadApplicationConfig({ environment }) {
  return loadApplicationSettings(loadApplicationEnvironment(environment));
}
