import { writeDisplaySessionBinding } from "@/lib/syncOutput";

const DISPLAY_POPUP_NAME = "scripture-display";
const DEFAULT_WIDTH = 1400;
const DEFAULT_HEIGHT = 900;

function getPopupFeatures() {
  if (typeof window === "undefined") {
    return `popup=yes,width=${DEFAULT_WIDTH},height=${DEFAULT_HEIGHT}`;
  }

  const width = Math.min(
    DEFAULT_WIDTH,
    Math.max(1000, window.screen.availWidth - 80),
  );
  const height = Math.min(
    DEFAULT_HEIGHT,
    Math.max(700, window.screen.availHeight - 120),
  );
  const left = Math.max(20, window.screen.availWidth - width - 20);
  const top = 40;

  return [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "resizable=yes",
    "scrollbars=no",
  ].join(",");
}

export function openDisplayWindow(sessionId: string) {
  if (typeof window === "undefined" || !sessionId) return null;

  writeDisplaySessionBinding(sessionId);

  const popup = window.open(
    `/display?session=${encodeURIComponent(sessionId)}`,
    DISPLAY_POPUP_NAME,
    getPopupFeatures(),
  );

  if (!popup) return null;

  try {
    popup.focus();
  } catch {}

  return popup;
}