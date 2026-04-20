export function openDisplayWindow(sessionId: string) {
  if (typeof window === "undefined") return null;

  const popup = window.open(
    `/display?session=${encodeURIComponent(sessionId)}`,
    `scripture-display-${sessionId}`,
    "popup=yes,width=1400,height=900",
  );

  popup?.focus();
  return popup;
}