export default function createLockLifecycle(releaseLock, { onReleased, onRetry } = {}) {
  let released = false;
  const release = () => {
    if (released) return;
    try {
      releaseLock?.();
      released = true;
      onReleased?.();
    } catch (error) {
      onRetry?.(release);
      throw error;
    }
  };
  return release;
}
