import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { ROLES } from "../constants/roles.js";
import { resolveIdentity } from "../middleware/authenticate.js";
import { assertCanFollow } from "./locationService.js";
import { setTrackingEmitter, trackingRoom } from "./trackingHub.js";

const MAX_FOLLOWED_PER_SOCKET = 5;

// Live tracking channel. Employers only: they follow the applications they own and receive pushed updates.
// Workers keep sending their GPS over the existing validated HTTP endpoint; the server pushes it from there.
export function attachTrackingSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins },
    maxHttpBufferSize: 2_000,
  });

  // 1. Authenticate the connection with the same JWT + database check as the REST API.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || !token) return next(new Error("unauthorized"));
      const identity = await resolveIdentity(token);
      if (!identity || identity.auth.role !== ROLES.EMPLOYER) return next(new Error("unauthorized"));
      socket.data.auth = identity.auth;
      socket.data.exp = jwt.decode(token)?.exp ?? 0;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const followed = new Set();

    // Disconnect when the token expires, like a REST call would start failing with 401.
    const msLeft = socket.data.exp * 1000 - Date.now();
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(1_000, msLeft));
    expiry.unref();
    socket.on("disconnect", () => clearTimeout(expiry));

    // 2. Joining a room is the authorization check: the application must belong to this employer and be active.
    socket.on("tracking:follow", async (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      try {
        const applicationId = typeof payload?.applicationId === "string" ? payload.applicationId : "";
        if (!followed.has(applicationId) && followed.size >= MAX_FOLLOWED_PER_SOCKET) return reply({ ok: false, code: "TOO_MANY" });
        await assertCanFollow(socket.data.auth, applicationId);
        await socket.join(trackingRoom(applicationId));
        followed.add(applicationId);
        reply({ ok: true });
      } catch (err) {
        reply({ ok: false, code: err?.extra?.code || (err?.status === 403 ? "FORBIDDEN" : "FAILED") });
      }
    });

    socket.on("tracking:unfollow", (payload) => {
      const applicationId = typeof payload?.applicationId === "string" ? payload.applicationId : "";
      if (!followed.delete(applicationId)) return;
      socket.leave(trackingRoom(applicationId));
    });
  });

  setTrackingEmitter((room, event, payload) => io.to(room).emit(event, payload));
  return io;
}
