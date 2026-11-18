// A tiny bridge between the services and the Socket.IO server.
// Services call these functions; they do nothing until the socket server registers itself,
// so tests and scripts that never start Socket.IO keep working.
let emitter = null;

export const trackingRoom = (applicationId) => `tracking:${applicationId}`;

export function setTrackingEmitter(fn) {
  emitter = fn;
}

function publish(applicationId, event, payload) {
  if (!emitter) return;
  try {
    emitter(trackingRoom(applicationId), event, payload);
  } catch (err) {
    console.error("[tracking] could not publish:", err.message);
  }
}

// A new GPS point was stored. Only sent after the database accepted it (consent + active work verified).
export const publishLocation = (applicationId, location, serverTime = new Date()) =>
  publish(applicationId, "tracking:location", { applicationId: String(applicationId), location, serverTime: new Date(serverTime).toISOString() });

// Something about the work changed (status, consent, completion). Carries no data: followers refetch over authenticated HTTP.
export const publishChanged = (applicationId) => publish(applicationId, "tracking:changed", { applicationId: String(applicationId) });
