"use client";

import { useEffect, useState } from "react";
import DisplayCanvas from "./DisplayCanvas";
import {
  publishOutputViewport,
  readStoredOutputState,
  subscribeToOutputState
} from "@/lib/syncOutput";
import type { OutputState, ThemeSettings } from "@/types/scripture";

const DEFAULT_THEME: ThemeSettings = {
  fontSize: 54,
  textAlign: "center",
  textColor: "#ffffff",
  backgroundColor: "#000000",
  lineHeight: 1.5,
  showReference: true
};

const DEFAULT_STATE: OutputState = {
  mode: "blank",
  theme: DEFAULT_THEME
};

export default function DisplayClient() {
  const [state, setState] = useState<OutputState>(DEFAULT_STATE);

  useEffect(() => {
    const publishSize = () => {
      publishOutputViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    publishSize();
    window.addEventListener("resize", publishSize);

    return () => {
      window.removeEventListener("resize", publishSize);
    };
  }, []);

  useEffect(() => {
    const stored = readStoredOutputState();
    if (stored) setState(stored);

    return subscribeToOutputState((nextState) => {
      setState(nextState);
    });
  }, []);

  return <DisplayCanvas state={state} />;
}