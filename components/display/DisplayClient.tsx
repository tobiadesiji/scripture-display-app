"use client";

import { useEffect, useState } from "react";
import DisplayCanvas from "./DisplayCanvas";
import {
  readDisplaySessionBinding,
  readStoredOutputState,
  subscribeToDisplaySessionBinding,
  subscribeToOutputState,
  subscribeToPresentationCommands,
  writeDisplayPresence,
} from "@/lib/syncOutput";
import type { OutputState } from "@/types/scripture";

export default function DisplayClient() {
  const [sessionId, setSessionId] = useState("");
  const [state, setState] = useState<OutputState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const boundSessionId = readDisplaySessionBinding();
    if (boundSessionId) {
      setSessionId(boundSessionId);
    }

    return subscribeToDisplaySessionBinding((nextSessionId) => {
      setSessionId(nextSessionId);
      setState(nextSessionId ? readStoredOutputState(nextSessionId) : null);
    });
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setState(null);
      return;
    }

    const stored = readStoredOutputState(sessionId);
    if (stored) {
      setState(stored);
    }

    return subscribeToOutputState(sessionId, (nextState) => {
      setState(nextState);
    });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    return subscribeToPresentationCommands(sessionId, async (command) => {
      if (command.type !== "toggle-fullscreen") return;

      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch {}
    });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    writeDisplayPresence(sessionId);

    const interval = window.setInterval(() => {
      writeDisplayPresence(sessionId);
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  };

  return (
    <DisplayCanvas
      state={state}
      isFullscreen={isFullscreen}
      onToggleFullscreen={handleToggleFullscreen}
      sessionId={sessionId}
    />
  );
}