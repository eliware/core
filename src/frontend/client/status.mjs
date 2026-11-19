export default function createClientStatus(document, status) {
  const canRender = Boolean(document.querySelector("[data-health-list]"));
  if (!canRender && status) status.textContent = "Core dashboard assets loaded.";
  return {
    canRender,
    showUnavailable() {
      if (status) status.textContent = "Status is unavailable. Retrying shortly.";
    },
  };
}
