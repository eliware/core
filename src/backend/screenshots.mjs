import capturePageScreenshot from "./browser-capture.mjs";
import resolveScreenshotConfig from "./screenshot/config.mjs";
import prepareScreenshotOutput from "./screenshot/output.mjs";

export default async function captureScreenshot({ url, output, makeDirectory }) {
  const options = resolveScreenshotConfig({ url, output });
  return capturePageScreenshot({
    url: options.url,
    prepareTarget: () => prepareScreenshotOutput(options.output, makeDirectory),
  });
}
