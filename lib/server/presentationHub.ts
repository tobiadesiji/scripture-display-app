import type { OutputState } from "@/types/scripture";

export type OutputViewport = { width: number; height: number };

export type PresentationCommand = {
  id: string;
  type: "toggle-fullscreen";
  source?: "control" | "display" | "remote";
  createdAt: number;
};

export type PresentationSnapshot = {
  state: OutputState | null;
  viewport: OutputViewport | null;
  lastCommand: PresentationCommand | null;
};

export type PresentationEvent =
  | { type: "state"; payload: OutputState }
  | { type: "viewport"; payload: OutputViewport }
  | { type: "command"; payload: PresentationCommand }
  | { type: "snapshot"; payload: PresentationSnapshot }
  | { type: "ping"; payload: { time: number } };

type Subscriber = (event: PresentationEvent) => void;

type Hub = {
  state: OutputState | null;
  viewport: OutputViewport | null;
  lastCommand: PresentationCommand | null;
  subscribers: Set<Subscriber>;
};

type Hubs = Map<string, Hub>;

declare global {
  // eslint-disable-next-line no-var
  var __presentationHubs: Hubs | undefined;
}

function getHubs(): Hubs {
  if (!globalThis.__presentationHubs) {
    globalThis.__presentationHubs = new Map<string, Hub>();
  }

  return globalThis.__presentationHubs;
}

function getHub(sessionId: string): Hub {
  const hubs = getHubs();

  if (!hubs.has(sessionId)) {
    hubs.set(sessionId, {
      state: null,
      viewport: null,
      lastCommand: null,
      subscribers: new Set(),
    });
  }

  return hubs.get(sessionId)!;
}

export function getPresentationSnapshot(
  sessionId: string,
): PresentationSnapshot {
  const hub = getHub(sessionId);

  return {
    state: hub.state,
    viewport: hub.viewport,
    lastCommand: hub.lastCommand,
  };
}

export function updatePresentationState(
  sessionId: string,
  state: OutputState,
) {
  const hub = getHub(sessionId);
  hub.state = state;
  broadcastPresentationEvent(sessionId, { type: "state", payload: state });
}

export function updatePresentationViewport(
  sessionId: string,
  viewport: OutputViewport,
) {
  const hub = getHub(sessionId);
  hub.viewport = viewport;
  broadcastPresentationEvent(sessionId, { type: "viewport", payload: viewport });
}

export function publishPresentationCommand(
  sessionId: string,
  command: PresentationCommand,
) {
  const hub = getHub(sessionId);
  hub.lastCommand = command;
  broadcastPresentationEvent(sessionId, { type: "command", payload: command });
}

export function subscribeToPresentationEvents(
  sessionId: string,
  subscriber: Subscriber,
) {
  const hub = getHub(sessionId);
  hub.subscribers.add(subscriber);

  return () => {
    hub.subscribers.delete(subscriber);
  };
}

export function broadcastPresentationEvent(
  sessionId: string,
  event: PresentationEvent,
) {
  const hub = getHub(sessionId);

  for (const subscriber of hub.subscribers) {
    try {
      subscriber(event);
    } catch {}
  }
}