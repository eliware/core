import sendAssetResponse from "./response.mjs";
import readRouteAsset from "./serving.mjs";
import resolveRoute from "../route-resolver.mjs";

export default function createAssetRequestHandler({
  publicRoot,
  buildRoot,
  openFile,
  statPath,
  resolvePath,
}) {
  return async function handleAssetRequest(request, reply) {
    const path = new URL(request.url, "http://localhost").pathname;
    const route = resolveRoute(path);
    if (route === null) return sendAssetResponse(reply, route, null);
    const content = await readRouteAsset(route, {
      publicRoot,
      buildRoot,
      openFile,
      statPath,
      resolvePath,
    });
    return sendAssetResponse(reply, route, content);
  };
}
