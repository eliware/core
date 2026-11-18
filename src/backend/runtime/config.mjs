import loadApplicationConfig from "../config.mjs";
import loadEnvironmentFile from "../environment-loader.mjs";

export default function loadRuntimeConfig({
  environment,
  loadEnvironment = loadEnvironmentFile,
} = {}) {
  loadEnvironment();
  return loadApplicationConfig({ environment: environment ?? process.env });
}
