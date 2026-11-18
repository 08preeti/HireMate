"use client";

import { useEffect, useRef, useState } from "react";
import { acquireSocket, releaseSocket } from "@/lib/socket";
import type { LiveLocation } from "@/types";

export interface LocationPush {
  applicationId: string;
  serverTime: string;
  location: LiveLocation;
}

interface Handlers {
  onLocation: (push: LocationPush) => void;
  /** Status, consent or completion changed: the caller should refetch. */
  onChanged: () => void;
}

/**
 * Employer side: follows ONE application over the shared socket. The server only lets the employer who owns the
 * application join. Following is repeated on every reconnect, and everything is removed on unmount.
 */
export function useTrackingChannel(applicationId: string | null, handlers: Handlers) {
  const [connected, setConnected] = useState(false);
  const [followed, setFollowed] = useState(false);
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    setConnected(false);
    setFollowed(false);
    if (!applicationId) return;
    const socket = acquireSocket();
    let active = true;

    const follow = () => {
      socket.emit("tracking:follow", { applicationId }, (reply: { ok?: boolean } | undefined) => {
        if (active) setFollowed(!!reply?.ok);
      });
    };
    const onConnect = () => {
      setConnected(true);
      follow();
    };
    const onDisconnect = () => {
      setConnected(false);
      setFollowed(false);
    };
    const onLocation = (push: LocationPush) => {
      if (push?.applicationId === applicationId) ref.current.onLocation(push);
    };
    const onChanged = (push: { applicationId?: string }) => {
      if (push?.applicationId === applicationId) ref.current.onChanged();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("tracking:location", onLocation);
    socket.on("tracking:changed", onChanged);
    if (socket.connected) onConnect();

    return () => {
      active = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("tracking:location", onLocation);
      socket.off("tracking:changed", onChanged);
      if (socket.connected) socket.emit("tracking:unfollow", { applicationId });
      releaseSocket();
    };
  }, [applicationId]);

  return { connected, live: connected && followed };
}
