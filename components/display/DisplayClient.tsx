"use client";

import { useEffect, useRef, useState } from "react";
import DisplayCanvas from "./DisplayCanvas";
import {
  publishOutputViewport,
  readStoredOutputState,
  subscribeToOutputState,
  subscribeToPresentationCommands,
} from "@/lib/syncOutput";
import { ensureSessionInLocation } from "@/lib/session";
import type { OutputState, ThemeSettings } from "@/types/scripture";

const DEFAULT_THEME: ThemeSettings = {
  fontSize: 54,
  textAlign: "center",
  textColor: "#ffffff",
  backgroundColor: "#000000",
  lineHeight: 1.5,
  showReference: true,
};

const DEFAULT_STATE: OutputState = {
  mode: "blank",
  theme: DEFAULT_THEME,
};

export default function DisplayClient() {
  const [state, setState] = useState<OutputState>(DEFAULT_STATE);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const processed = useRef(new Set<string>());

  useEffect(() => {
    const safeSession = ensureSessionInLocation();
    setSessionId(safeSession);
  }, []);

  useEffect(() => {
    const publishSize = () =>
      publishOutputViewport(
        {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        sessionId,
      );

    const onFs = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      publishSize();
    };

    publishSize();
    onFs();

    window.addEventListener("resize", publishSize);
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      window.removeEventListener("resize", publishSize);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [sessionId]);

  useEffect(() => {
    const stored = readStoredOutputState(sessionId);
    if (stored) {
      setState(stored);
    }

    return subscribeToOutputState(sessionId, setState);
  }, [sessionId]);

  useEffect(() => {
    const toggle = async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } catch {}
    };

    return subscribeToPresentationCommands(sessionId, (command) => {
      if (processed.current.has(command.id)) return;
      processed.current.add(command.id);

      if (command.type === "toggle-fullscreen") {
        void toggle();
      }
    });
  }, [sessionId]);

  return (
    <DisplayCanvas
      state={state}
      isFullscreen={isFullscreen}
      sessionId={sessionId}
      onToggleFullscreen={() => {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          void document.documentElement.requestFullscreen();
        }
      }}
    />
  );
}