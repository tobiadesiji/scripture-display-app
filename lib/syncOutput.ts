import type { OutputState } from "@/types/scripture";

export const OUTPUT_CHANNEL = "scripture-output";
export const OUTPUT_STORAGE_KEY = "scripture-output-state";
export const OUTPUT_VIEWPORT_STORAGE_KEY = "scripture-output-viewport";

export function createOutputChannel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(OUTPUT_CHANNEL);
}

export function publishOutputState(state: OutputState) {
  if (typeof window === "undefined") return;

  localStorage.setItem(OUTPUT_STORAGE_KEY, JSON.stringify(state));

  const channel = createOutputChannel();
  if (channel) {
    channel.postMessage({ type: "state", payload: state });
    channel.close();
  }
}

export function readStoredOutputState(): OutputState | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(OUTPUT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OutputState;
  } catch {
    return null;
  }
}

export function publishOutputViewport(viewport: { width: number; height: number }) {
  if (typeof window === "undefined") return;

  localStorage.setItem(OUTPUT_VIEWPORT_STORAGE_KEY, JSON.stringify(viewport));

  const channel = createOutputChannel();
  if (channel) {
    channel.postMessage({ type: "viewport", payload: viewport });
    channel.close();
  }
}

export function readStoredOutputViewport(): { width: number; height: number } | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(OUTPUT_VIEWPORT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { width: number; height: number };
  } catch {
    return null;
  }
}

export function subscribeToOutputState(callback: (state: OutputState) => void) {
  if (typeof window === "undefined") return () => {};

  const channel = createOutputChannel();

  const onStorage = (event: StorageEvent) => {
    if (event.key !== OUTPUT_STORAGE_KEY || !event.newValue) return;
    try {
      callback(JSON.parse(event.newValue) as OutputState);
    } catch {}
  };

  const onChannel = (event: MessageEvent) => {
    if (event.data?.type === "state") {
      callback(event.data.payload as OutputState);
    }
  };

  window.addEventListener("storage", onStorage);
  channel?.addEventListener("message", onChannel);

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.removeEventListener("message", onChannel);
    channel?.close();
  };
}

export function subscribeToOutputViewport(
  callback: (viewport: { width: number; height: number }) => void
) {
  if (typeof window === "undefined") return () => {};

  const channel = createOutputChannel();

  const onStorage = (event: StorageEvent) => {
    if (event.key !== OUTPUT_VIEWPORT_STORAGE_KEY || !event.newValue) return;
    try {
      callback(JSON.parse(event.newValue) as { width: number; height: number });
    } catch {}
  };

  const onChannel = (event: MessageEvent) => {
    if (event.data?.type === "viewport") {
      callback(event.data.payload as { width: number; height: number });
    }
  };

  window.addEventListener("storage", onStorage);
  channel?.addEventListener("message", onChannel);

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.removeEventListener("message", onChannel);
    channel?.close();
  };
}