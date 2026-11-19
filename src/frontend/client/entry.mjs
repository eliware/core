import renderHome from "../client.mjs";

renderHome(document);

if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("/service-worker.js").catch(() => {});
