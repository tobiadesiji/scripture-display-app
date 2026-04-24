"use client";

import { useEffect, useMemo, useState } from "react";
import DisplayCanvas from "./DisplayCanvas";
import {
  readDisplaySessionBinding,
  readStoredOutputState,
  subscribeToDisplaySessionBinding,
  subscribeToOutputState,
  subscribeToPresentationCommands,
  writeDisplayPresence,
  writeDisplaySessionBinding,
  postDisplayPresence,
} from "@/lib/syncOutput";
import type { OutputState } from "@/types/scripture";

type DisplayClientProps = {
  forcedSessionId?: string;
};

export default function DisplayClient({ forcedSessionId }: DisplayClientProps) {
  const initialQuerySessionId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("session") || "";
  }, []);

  const [sessionId, setSessionId] = useState(
    forcedSessionId || initialQuerySessionId || readDisplaySessionBinding() || "",
  );
  const [state, setState] = useState<OutputState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const querySessionId =
      forcedSessionId ||
      new URLSearchParams(window.location.search).get("session")?.trim() ||
      "";

    if (!querySessionId) return;

    writeDisplaySessionBinding(querySessionId);
    setSessionId(querySessionId);

    window.history.replaceState({}, "", "/display");
  }, [forcedSessionId]);

  useEffect(() => {
    const resolveBinding = () => {
      if (forcedSessionId) {
        setSessionId(forcedSessionId);
        return;
      }

      const boundSessionId = readDisplaySessionBinding();
      if (boundSessionId) {
        setSessionId(boundSessionId);
      }
    };

    resolveBinding();

    const onFocus = () => resolveBinding();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [forcedSessionId]);

  useEffect(() => {
    if (forcedSessionId || initialQuerySessionId) return;

    return subscribeToDisplaySessionBinding((nextSessionId) => {
      setSessionId(nextSessionId || "");
    });
  }, [forcedSessionId, initialQuerySessionId]);

  useEffect(() => {
    if (!sessionId) {
      setState(null);
      return;
    }

    writeDisplayPresence(sessionId);
    void postDisplayPresence(sessionId);

    const stored = readStoredOutputState(sessionId);
    if (stored) {
      setState(stored);
    }

    const stopOutput = subscribeToOutputState(sessionId, (nextState) => {
      setState(nextState);
      writeDisplayPresence(sessionId);
      void postDisplayPresence(sessionId);
    });

    const stopCommands = subscribeToPresentationCommands(sessionId, (command) => {
      if (command.type === "toggle-fullscreen") {
        setIsFullscreen((prev) => !prev);
      }
      writeDisplayPresence(sessionId);
      void postDisplayPresence(sessionId);
    });

    const interval = window.setInterval(() => {
      writeDisplayPresence(sessionId);
      void postDisplayPresence(sessionId);
    }, 3000);

    return () => {
      stopOutput();
      stopCommands();
      window.clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    const element = document.documentElement;

    const enterFullscreen = async () => {
      if (!document.fullscreenElement) {
        try {
          await element.requestFullscreen();
        } catch {}
      }
    };

    const exitFullscreen = async () => {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {}
      }
    };

    if (isFullscreen) {
      void enterFullscreen();
    } else {
      void exitFullscreen();
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  return (
    <DisplayCanvas
      state={state}
      isFullscreen={isFullscreen}
      sessionId={sessionId}
      onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
    />
  );
}