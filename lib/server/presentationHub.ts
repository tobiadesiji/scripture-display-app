import type { OutputState } from "@/types/scripture";
import type { OutputViewport, PresentationCommand } from "@/lib/syncOutput";

export type PresentationSnapshot = {
  state: OutputState | null;
  viewport: OutputViewport | null;
  lastCommand: PresentationCommand | null;
  updatedAt: number;
  presenceTs: number | null;
};

type HubStore = Map<string, PresentationSnapshot>;

declare global {
  // eslint-disable-next-line no-var
  var __presentationHubStore__: HubStore | undefined;
}

function getStore(): HubStore {
  if (!globalThis.__presentationHubStore__) {
    globalThis.__presentationHubStore__ = new Map();
  }

  return globalThis.__presentationHubStore__;
}

export function getPresentationSnapshot(
  sessionId: string,
): PresentationSnapshot | null {
  return getStore().get(sessionId) ?? null;
}

export function updatePresentationSnapshot(
  sessionId: string,
  update: {
    state?: OutputState;
    viewport?: OutputViewport;
    command?: PresentationCommand;
    presence?: boolean;
  },
): PresentationSnapshot {
  const store = getStore();

  const current =
    store.get(sessionId) ??
    ({
      state: null,
      viewport: null,
      lastCommand: null,
      updatedAt: Date.now(),
      presenceTs: null,
    } satisfies PresentationSnapshot);

  const next: PresentationSnapshot = {
    state: update.state !== undefined ? update.state : current.state,
    viewport:
      update.viewport !== undefined ? update.viewport : current.viewport,
    lastCommand:
      update.command !== undefined ? update.command : current.lastCommand,
    updatedAt: Date.now(),
    presenceTs: update.presence === true ? Date.now() : current.presenceTs,
  };

  store.set(sessionId, next);
  return next;
}