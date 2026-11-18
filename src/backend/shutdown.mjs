export default function createShutdownHook({
  server,
  webhookServer,
  log,
  stopHealthMonitor = () => {},
  isListening,
}) {
  let stopped = false;
  let shutdownPromise;

  return function shutdown() {
    if (stopped) return Promise.resolve();
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = Promise.resolve()
      .then(() => stopHealthMonitor())
      .then(() =>
        Promise.all(
          [server, webhookServer]
            .filter(Boolean)
            .filter((item) =>
              isListening ? isListening(item) : !item.server || item.server.listening,
            )
            .map((item) => item.close()),
        ),
      )
      .catch((error) => {
        shutdownPromise = undefined;
        throw error;
      })
      .then(() => {
        stopped = true;
        log.info("Web application stopped");
      });

    return shutdownPromise;
  };
}
