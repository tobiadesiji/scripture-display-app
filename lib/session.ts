const SESSION_PARAM = "session";

function normaliseSessionValue(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createSessionId() {
  return `session-${Math.random().toString(36).slice(2, 8)}`;
}

export function getSessionFromSearch(search: string) {
  return normaliseSessionValue(
    new URLSearchParams(search).get(SESSION_PARAM),
  );
}

export function getCurrentSessionId() {
  if (typeof window === "undefined") return "";
  return getSessionFromSearch(window.location.search);
}

export function buildSessionUrl(pathname: string, sessionId?: string) {
  const safeSession = normaliseSessionValue(sessionId) || createSessionId();
  return `${pathname}?${SESSION_PARAM}=${encodeURIComponent(safeSession)}`;
}

export function ensureSessionInLocation() {
  if (typeof window === "undefined") {
    return createSessionId();
  }

  const url = new URL(window.location.href);
  const existing = normaliseSessionValue(url.searchParams.get(SESSION_PARAM));
  const resolved = existing || createSessionId();

  if (url.searchParams.get(SESSION_PARAM) !== resolved) {
    url.searchParams.set(SESSION_PARAM, resolved);
    window.history.replaceState({}, "", url.toString());
  }

  return resolved;
}