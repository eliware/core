export default function createShutdownHook({
  server,
  webhookServer,
  log,
  stopHealthMonitor = () => {},
  stopMetricsMonitor = () => {},
  stopSystemdEventMonitor = () => {},
  isListening,
}) {
  let stopped = false;
  let shutdownPromise;

  return function shutdown() {
    if (stopped) return Promise.resolve();
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = Promise.resolve()
      .then(() =>
        Promise.all([stopHealthMonitor(), stopMetricsMonitor(), stopSystemdEventMonitor()]),
      )
      .then(() =>
        Promise.all(
          [server, webhookServer]
            .filter(Boolean)
            .filter((item) =>
              isListening ? isListening(item) : !item.server || item.server.listening,
            )
            .map((item) => closeServer(item)),
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

async function closeServer(server) {
  try {
    await server.close();
  } catch (error) {
    if (server.server?.listening || !server.server) throw error;
  }
}
