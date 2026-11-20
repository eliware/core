export default function createSystemdEventHandler({ readUnitState, recordEvent }) {
  return async function handleSystemdEvent(event) {
    const state = await readUnitState(event.name);
    const status = ["failed", "stopped"].includes(event.event) ? "unhealthy" : state.status;
    await recordEvent({ ...event, ...state, status });
  };
}
