export default function createHealthPolling({
  intervalMs,
  runCheck,
  onSetupFailure,
  setIntervalFn,
  clearIntervalFn,
}) {
  let timer;
  let running;
  let runningGeneration;
  let restartScheduled = false;
  let generation = 0;
  let stopped = true;

  function check() {
    if (running) return running;
    const checkGeneration = generation;
    let result;
    try {
      result = runCheck(() => checkGeneration === generation);
    } catch (error) {
      result = Promise.reject(error);
    }
    const current = Promise.resolve(result).finally(() => {
      running = undefined;
      runningGeneration = undefined;
      if (restartScheduled) {
        restartScheduled = false;
        startCheck();
      }
    });
    running = current;
    runningGeneration = checkGeneration;
    return current;
  }

  function startCheck() {
    if (stopped) return;
    if (running && runningGeneration !== generation) {
      restartScheduled = true;
      return;
    }
    const checkGeneration = generation;
    void check().catch(() => onSetupFailure(() => checkGeneration === generation));
  }

  function start() {
    if (timer !== undefined) return;
    const nextTimer = setIntervalFn(startCheck, intervalMs);
    timer = nextTimer;
    stopped = false;
    timer.unref?.();
    startCheck();
  }

  async function stop({ waitForActive = true } = {}) {
    stopped = true;
    generation += 1;
    restartScheduled = false;
    if (timer !== undefined) clearIntervalFn(timer);
    timer = undefined;
    const activeCheck = running;
    if (activeCheck && waitForActive) await activeCheck;
  }

  return {
    check,
    getActiveCheck: () => running,
    isStopped: () => stopped,
    start,
    stop,
  };
}
