export function resolveRoute(path) {
  if (path === "/") return { root: "public", file: "index.html", contentType: "text/html" };
  if (path === "/client.js")
    return { root: "build", file: "client.js", contentType: "text/javascript" };
  const publicAssets = {
    "/styles.css": ["styles.css", "text/css"],
    "/manifest.webmanifest": ["manifest.webmanifest", "application/manifest+json"],
    "/service-worker.js": ["service-worker.js", "text/javascript", "build"],
    "/icons/template.svg": ["icons/template.svg", "image/svg+xml"],
    "/icons/template-maskable.svg": ["icons/template-maskable.svg", "image/svg+xml"],
    "/icons/template-192.png": ["icons/template-192.png", "image/png"],
    "/icons/template-512.png": ["icons/template-512.png", "image/png"],
    "/icons/template-maskable-512.png": ["icons/template-maskable-512.png", "image/png"],
    "/screenshots/core-desktop.png": ["screenshots/core-desktop.png", "image/png"],
    "/screenshots/core-mobile.png": ["screenshots/core-mobile.png", "image/png"],
  };
  if (publicAssets[path]) {
    const [file, contentType, root = "public"] = publicAssets[path];
    return { root, file, contentType };
  }
  return null;
}
