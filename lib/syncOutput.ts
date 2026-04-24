import type { OutputState } from "@/types/scripture";

export const OUTPUT_CHANNEL = "scripture-output";
export const OUTPUT_STORAGE_KEY = "scripture-output-state";
export const OUTPUT_VIEWPORT_STORAGE_KEY = "scripture-output-viewport";
export const DISPLAY_SESSION_STORAGE_KEY = "scripture-display-session";
export const DISPLAY_PRESENCE_STORAGE_KEY = "scripture-display-presence";

export type OutputViewport = { width: number; height: number };

export type PresentationCommand = {
  id: string;
  type: "toggle-fullscreen";
  source?: "control" | "display" | "remote";
  createdAt: number;
};

type Snapshot = {
  state: OutputState | null;
  viewport: OutputViewport | null;
  lastCommand: PresentationCommand | null;
  presenceTs: number | null;
};

function getScopedChannelName(sessionId: string) {
  return `${OUTPUT_CHANNEL}:${sessionId}`;
}

function getScopedStateStorageKey(sessionId: string) {
  return `${OUTPUT_STORAGE_KEY}:${sessionId}`;
}

function getScopedViewportStorageKey(sessionId: string) {
  return `${OUTPUT_VIEWPORT_STORAGE_KEY}:${sessionId}`;
}

function getDisplayPresenceStorageKey(sessionId: string) {
  return `${DISPLAY_PRESENCE_STORAGE_KEY}:${sessionId}`;
}

export function createOutputChannel(sessionId: string) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  return new BroadcastChannel(getScopedChannelName(sessionId));
}

export function writeDisplaySessionBinding(sessionId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISPLAY_SESSION_STORAGE_KEY, sessionId);
}

export function readDisplaySessionBinding() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(DISPLAY_SESSION_STORAGE_KEY) ?? "";
}

export function clearDisplaySessionBinding() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DISPLAY_SESSION_STORAGE_KEY);
}

export function subscribeToDisplaySessionBinding(
  callback: (sessionId: string) => void,
) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key !== DISPLAY_SESSION_STORAGE_KEY) return;
    callback(event.newValue ?? "");
  };

  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
  };
}

export function writeDisplayPresence(sessionId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getDisplayPresenceStorageKey(sessionId),
    JSON.stringify({ ts: Date.now() }),
  );
}

export function readDisplayPresence(sessionId: string): number | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(getDisplayPresenceStorageKey(sessionId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { ts?: number };
    return typeof parsed.ts === "number" ? parsed.ts : null;
  } catch {
    return null;
  }
}

export function subscribeToDisplayPresence(
  sessionId: string,
  callback: (timestamp: number | null) => void,
) {
  if (typeof window === "undefined") return () => {};

  const key = getDisplayPresenceStorageKey(sessionId);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== key) return;

    if (!event.newValue) {
      callback(null);
      return;
    }

    try {
      const parsed = JSON.parse(event.newValue) as { ts?: number };
      callback(typeof parsed.ts === "number" ? parsed.ts : null);
    } catch {
      callback(null);
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
  };
}

async function postPresentationUpdate(
  payload: {
    state?: OutputState;
    viewport?: OutputViewport;
    command?: PresentationCommand;
    presence?: boolean;
  },
  sessionId: string,
) {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/presentation/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        ...payload,
      }),
      keepalive: true,
    });
  } catch {
    // local same-browser sync can still continue
  }
}

async function fetchPresentationSnapshot(
  sessionId: string,
): Promise<Snapshot | null> {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL("/api/presentation/state", window.location.origin);
    url.searchParams.set("sessionId", sessionId);

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) return null;

    return (await response.json()) as Snapshot;
  } catch {
    return null;
  }
}

function subscribeToServerSnapshots(
  sessionId: string,
  listener: (snapshot: Snapshot) => void,
) {
  if (typeof window === "undefined") return () => {};

  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    const snapshot = await fetchPresentationSnapshot(sessionId);
    if (snapshot && !stopped) {
      listener(snapshot);
    }
  };

  void tick();

  const interval = window.setInterval(() => {
    void tick();
  }, 700);

  return () => {
    stopped = true;
    window.clearInterval(interval);
  };
}

export async function postDisplayPresence(sessionId: string) {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/presentation/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        presence: true,
      }),
      keepalive: true,
    });
  } catch {}
}

export async function readServerDisplayPresence(
  sessionId: string,
): Promise<number | null> {
  const snapshot = await fetchPresentationSnapshot(sessionId);
  return snapshot?.presenceTs ?? null;
}

export function publishOutputState(state: OutputState, sessionId: string) {
  if (typeof window === "undefined") return;

  localStorage.setItem(getScopedStateStorageKey(sessionId), JSON.stringify(state));

  const channel = createOutputChannel(sessionId);
  if (channel) {
    channel.postMessage({ type: "state", payload: state });
    channel.close();
  }

  void postPresentationUpdate({ state }, sessionId);
}

export function readStoredOutputState(sessionId: string): OutputState | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(getScopedStateStorageKey(sessionId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OutputState;
  } catch {
    return null;
  }
}

export function publishOutputViewport(
  viewport: OutputViewport,
  sessionId: string,
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    getScopedViewportStorageKey(sessionId),
    JSON.stringify(viewport),
  );

  const channel = createOutputChannel(sessionId);
  if (channel) {
    channel.postMessage({ type: "viewport", payload: viewport });
    channel.close();
  }

  void postPresentationUpdate({ viewport }, sessionId);
}

export function readStoredOutputViewport(
  sessionId: string,
): OutputViewport | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(getScopedViewportStorageKey(sessionId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OutputViewport;
  } catch {
    return null;
  }
}

export function publishPresentationCommand(
  type: PresentationCommand["type"],
  source: PresentationCommand["source"] = "control",
  sessionId: string,
) {
  if (typeof window === "undefined") return;

  const command: PresentationCommand = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    type,
    source,
    createdAt: Date.now(),
  };

  const channel = createOutputChannel(sessionId);
  if (channel) {
    channel.postMessage({ type: "command", payload: command });
    channel.close();
  }

  void postPresentationUpdate({ command }, sessionId);
}

export function subscribeToOutputState(
  sessionId: string,
  callback: (state: OutputState) => void,
) {
  if (typeof window === "undefined") return () => {};

  const stateKey = getScopedStateStorageKey(sessionId);
  const channel = createOutputChannel(sessionId);
  let lastServerState = "";

  const onStorage = (event: StorageEvent) => {
    if (event.key !== stateKey || !event.newValue) return;

    try {
      callback(JSON.parse(event.newValue) as OutputState);
    } catch {}
  };

  const onChannel = (event: MessageEvent) => {
    if (event.data?.type === "state") {
      callback(event.data.payload as OutputState);
    }
  };

  const stopServer = subscribeToServerSnapshots(sessionId, (snapshot) => {
    if (!snapshot.state) return;

    const serialized = JSON.stringify(snapshot.state);
    if (serialized === lastServerState) return;

    lastServerState = serialized;
    callback(snapshot.state);
  });

  window.addEventListener("storage", onStorage);
  channel?.addEventListener("message", onChannel);

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.removeEventListener("message", onChannel);
    channel?.close();
    stopServer();
  };
}

export function subscribeToOutputViewport(
  sessionId: string,
  callback: (viewport: OutputViewport) => void,
) {
  if (typeof window === "undefined") return () => {};

  const viewportKey = getScopedViewportStorageKey(sessionId);
  const channel = createOutputChannel(sessionId);
  let lastServerViewport = "";

  const onStorage = (event: StorageEvent) => {
    if (event.key !== viewportKey || !event.newValue) return;

    try {
      callback(JSON.parse(event.newValue) as OutputViewport);
    } catch {}
  };

  const onChannel = (event: MessageEvent) => {
    if (event.data?.type === "viewport") {
      callback(event.data.payload as OutputViewport);
    }
  };

  const stopServer = subscribeToServerSnapshots(sessionId, (snapshot) => {
    if (!snapshot.viewport) return;

    const serialized = JSON.stringify(snapshot.viewport);
    if (serialized === lastServerViewport) return;

    lastServerViewport = serialized;
    callback(snapshot.viewport);
  });

  window.addEventListener("storage", onStorage);
  channel?.addEventListener("message", onChannel);

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.removeEventListener("message", onChannel);
    channel?.close();
    stopServer();
  };
}

export function subscribeToPresentationCommands(
  sessionId: string,
  callback: (command: PresentationCommand) => void,
) {
  if (typeof window === "undefined") return () => {};

  const channel = createOutputChannel(sessionId);
  let lastCommandId = "";

  const onChannel = (event: MessageEvent) => {
    if (event.data?.type === "command") {
      callback(event.data.payload as PresentationCommand);
    }
  };

  const stopServer = subscribeToServerSnapshots(sessionId, (snapshot) => {
    if (!snapshot.lastCommand) return;
    if (snapshot.lastCommand.id === lastCommandId) return;

    lastCommandId = snapshot.lastCommand.id;
    callback(snapshot.lastCommand);
  });

  channel?.addEventListener("message", onChannel);

  return () => {
    channel?.removeEventListener("message", onChannel);
    channel?.close();
    stopServer();
  };
}