export default function createSystemdEventHandler({ readUnitState, recordEvent }) {
  return async function handleSystemdEvent(event) {
    const state = await readUnitState(event.name);
    await recordEvent({ ...event, ...state });
  };
}
