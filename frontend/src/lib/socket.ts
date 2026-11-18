import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/config/env";
import { getToken } from "@/lib/session";

// One shared connection for the whole tab. It is opened when the first screen needs live updates
// and closed again when the last one leaves, so no connection or listener is left behind.
let socket: Socket | null = null;
let users = 0;

export function acquireSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      // Read the token on every (re)connect, so a fresh login is used and a signed-out user cannot reconnect.
      auth: (send) => send({ token: getToken() ?? "" }),
      reconnectionDelayMax: 10_000,
    });
  }
  users += 1;
  return socket;
}

export function releaseSocket(): void {
  users = Math.max(0, users - 1);
  if (users === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}
