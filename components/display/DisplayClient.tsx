"use client";

import { useEffect, useState } from "react";
import DisplayCanvas from "./DisplayCanvas";
import {
  readStoredOutputState,
  subscribeToOutputState,
  subscribeToPresentationCommands,
} from "@/lib/syncOutput";
import type { OutputState } from "@/types/scripture";

type Props = {
  sessionId: string;
};

export default function DisplayClient({ sessionId }: Props) {
  const [state, setState] = useState<OutputState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

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