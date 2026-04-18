export function openDisplayWindow() {
  if (typeof window === "undefined") return null;

  const popup = window.open(
    "/display",
    "scripture-display",
    "popup=yes,width=1400,height=900"
  );

  popup?.focus();
  return popup;
}
