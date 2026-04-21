"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import Button from "@/components/ui/Button";
import PreviewPanel from "./PreviewPanel";
import ReferenceInput from "./ReferenceInput";
import SettingsPanel from "./SettingsPanel";
import {
  parseReferenceDetailed,
  type ParseReferenceResult,
} from "@/lib/parseReference";
import { fetchNltVerses } from "@/lib/nltApi";
import { fetchApiBibleVerses } from "@/lib/apiBible";
import { buildReferenceLabel } from "@/lib/getPassage";
import { paginatePassageMeasured } from "@/lib/paginatePassageMeasured";
import { openDisplayWindow } from "@/lib/openDisplayWindow";
import {
  publishOutputState,
  readDisplayPresence,
  readStoredOutputState,
  readStoredOutputViewport,
  subscribeToDisplayPresence,
  subscribeToOutputState,
  subscribeToOutputViewport,
  writeDisplaySessionBinding,
} from "@/lib/syncOutput";
import { getAdjacentVerseReference } from "@/lib/getAdjacentVerse";
import { ensureSessionInLocation } from "@/lib/session";
import type {
  BibleVersion,
  PassageBundle,
  ThemeSettings,
  Verse,
} from "@/types/scripture";

const DEFAULT_THEME: ThemeSettings = {
  fontSize: 54,
  textAlign: "center",
  textColor: "#ffffff",
  backgroundColor: "#000000",
  lineHeight: 1.5,
  showReference: true,
  fontFamily: "inter",
  textShadow: "soft",
  textOutline: "none",
};

const DEFAULT_VIEWPORT = { width: 1400, height: 900 };

const LIVE_BUTTON_TAILWIND = "text-white shadow-lg";
const NEXT_GLOW_CLASSES =
  "ring-2 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.4)] animate-pulse";

function UtilityCard({
  title,
  subtitle,
  actionLabel,
  onOpen,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-left transition hover:border-slate-700 hover:bg-slate-800/80"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <span className="shrink-0 text-sm uppercase tracking-wide text-slate-400">
          {actionLabel}
        </span>
      </div>
    </button>
  );
}

function MobileRemoteModal({
  isOpen,
  onClose,
  remoteUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  remoteUrl: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Mobile Remote</h2>
            <p className="mt-1 text-sm text-slate-400">Scan for control</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="px-5 py-5 text-center">
          <div className="mb-4 inline-block rounded-xl bg-white p-3">
            <QRCodeSVG value={remoteUrl} size={180} />
          </div>
          <p className="break-all rounded border border-slate-800 bg-slate-950 p-2 text-xs text-slate-300">
            {remoteUrl}
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeSettings;
  onThemeChange: (theme: ThemeSettings) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Display Settings</h2>
            <p className="mt-1 text-sm text-slate-400">Styling and colors</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">
          <SettingsPanel theme={theme} onThemeChange={onThemeChange} />
        </div>
      </div>
    </div>
  );
}

function MobileSettingsCard({
  isOpen,
  onToggle,
  theme,
  onThemeChange,
}: {
  isOpen: boolean;
  onToggle: () => void;
  theme: ThemeSettings;
  onThemeChange: (theme: ThemeSettings) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 xl:hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <p className="text-base font-semibold text-white">Display Settings</p>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-slate-800 p-4">
          <SettingsPanel theme={theme} onThemeChange={onThemeChange} />
        </div>
      )}
    </section>
  );
}

export default function ControlClient() {
  const [referenceInput, setReferenceInput] = useState("John 3:16");
  const [activeReference, setActiveReference] = useState("John 3:16");
  const [version, setVersion] = useState<BibleVersion>("KJV");
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [error, setError] = useState("");
  const [bundle, setBundle] = useState<PassageBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [outputViewport, setOutputViewport] = useState(DEFAULT_VIEWPORT);
  const [sessionId, setSessionId] = useState("");
  const [hasLiveOutput, setHasLiveOutput] = useState(false);
  const [liveBundleKey, setLiveBundleKey] = useState("");
  const [recentPassages, setRecentPassages] = useState<string[]>([]);
  const [isDisplayConnected, setIsDisplayConnected] = useState(false);

  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  const hasMounted = useRef(false);
  const requestIdRef = useRef(0);

  const getBundleKey = useCallback((nextBundle: PassageBundle | null) => {
    if (!nextBundle) return "";
    return `${nextBundle.translation}-${nextBundle.reference}-p${nextBundle.currentPageIndex}`;
  }, []);

  const isCurrentPreviewLive = useMemo(() => {
    if (!bundle || !hasLiveOutput) return false;
    return getBundleKey(bundle) === liveBundleKey;
  }, [bundle, hasLiveOutput, liveBundleKey, getBundleKey]);

  const isActivelyLive = isCurrentPreviewLive && isDisplayConnected;

  const hasMoreContent = useMemo(() => {
    if (!bundle) return false;
    return bundle.currentPageIndex < bundle.pages.length - 1;
  }, [bundle]);

  const addToHistory = useCallback((ref: string) => {
    setRecentPassages((prev) => {
      const filtered = prev.filter((p) => p !== ref);
      return [ref, ...filtered].slice(0, 5);
    });
  }, []);

  const sendBundle = useCallback(
    (nextBundle: PassageBundle | null, nextTheme = theme) => {
      if (!nextBundle || !sessionId) return;

      publishOutputState(
        { mode: "passage", bundle: nextBundle, theme: nextTheme },
        sessionId,
      );
      setHasLiveOutput(true);
      setLiveBundleKey(getBundleKey(nextBundle));
    },
    [sessionId, theme, getBundleKey],
  );

  const loadPassage = useCallback(
    async (
      submittedReference: string,
      options?: { autoSend?: boolean; overrideVersion?: BibleVersion },
    ) => {
      const parseResult: ParseReferenceResult =
        parseReferenceDetailed(submittedReference);

      if (!parseResult.ok) {
        setBundle(null);
        setError(parseResult.error.message);
        return null;
      }

      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError("");

      try {
        const targetVersion = options?.overrideVersion ?? version;
        let selected: Verse[] = [];

        if (targetVersion === "NLT") {
          selected = await fetchNltVerses(
            targetVersion,
            submittedReference,
            parseResult.value,
          );
        } else {
          selected = await fetchApiBibleVerses(
            targetVersion,
            submittedReference,
            parseResult.value,
          );
        }

        if (requestId !== requestIdRef.current) return null;

        if (!selected.length) {
          setBundle(null);
          setError(`Not found in ${targetVersion}.`);
          return null;
        }

        const nextBundle: PassageBundle = {
          reference: buildReferenceLabel(parseResult.value, selected),
          translation: targetVersion,
          verses: selected,
          pages: paginatePassageMeasured(selected, theme, outputViewport),
          currentPageIndex: 0,
        };

        setVersion(targetVersion);
        setActiveReference(submittedReference);
        setBundle(nextBundle);
        addToHistory(nextBundle.reference);

        if (options?.autoSend) {
          sendBundle(nextBundle);
        }

        return nextBundle;
      } catch {
        setError("Error loading passage.");
        return null;
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [version, theme, outputViewport, addToHistory, sendBundle],
  );

  const clearScreen = useCallback(() => {
    if (!sessionId) return;
    publishOutputState({ mode: "blank", theme }, sessionId);
    setHasLiveOutput(false);
    setLiveBundleKey("");
  }, [sessionId, theme]);

  const handleSend = useCallback(async () => {
    await loadPassage(referenceInput, { autoSend: true });
  }, [referenceInput, loadPassage]);

  const navigate = useCallback(
    async (direction: "prev" | "next") => {
      if (!bundle || isLoading || isNavigating) return;

      const hasPrev = bundle.currentPageIndex > 0;
      const hasNext = bundle.currentPageIndex < bundle.pages.length - 1;

      if (direction === "prev" && hasPrev) {
        const nextBundle: PassageBundle = {
          ...bundle,
          currentPageIndex: bundle.currentPageIndex - 1,
        };
        setBundle(nextBundle);
        sendBundle(nextBundle);
        return;
      }

      if (direction === "next" && hasNext) {
        const nextBundle: PassageBundle = {
          ...bundle,
          currentPageIndex: bundle.currentPageIndex + 1,
        };
        setBundle(nextBundle);
        sendBundle(nextBundle);
        return;
      }

      const parseResult = parseReferenceDetailed(activeReference);
      if (!parseResult.ok) return;

      setIsNavigating(true);

      try {
        const res = await getAdjacentVerseReference(
          parseResult.value,
          version,
          direction,
        );

        if (res) {
          const loaded = await loadPassage(res.reference, { autoSend: true });
          if (loaded) {
            setReferenceInput(res.reference);
            setActiveReference(res.reference);
          }
        }
      } finally {
        setIsNavigating(false);
      }
    },
    [
      bundle,
      isLoading,
      isNavigating,
      activeReference,
      version,
      sendBundle,
      loadPassage,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          void handleSend();
          break;
        case "ArrowRight":
          void navigate("next");
          break;
        case "ArrowLeft":
          void navigate("prev");
          break;
        case "Escape":
          clearScreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSend, navigate, clearScreen]);

  useEffect(() => {
    const safeSession = ensureSessionInLocation();
    setSessionId(safeSession);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    writeDisplaySessionBinding(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setIsDisplayConnected(false);
      return;
    }

    const checkPresence = (timestamp: number | null) => {
      setIsDisplayConnected(Boolean(timestamp && Date.now() - timestamp < 7000));
    };

    checkPresence(readDisplayPresence(sessionId));

    const stop = subscribeToDisplayPresence(sessionId, checkPresence);

    const interval = window.setInterval(() => {
      checkPresence(readDisplayPresence(sessionId));
    }, 2000);

    return () => {
      stop();
      window.clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const stopState = subscribeToOutputState(sessionId, (nextState) => {
      if (nextState.mode === "passage") {
        setHasLiveOutput(true);
        setLiveBundleKey(getBundleKey(nextState.bundle));
      } else {
        setHasLiveOutput(false);
        setLiveBundleKey("");
      }
    });

    return () => stopState();
  }, [sessionId, getBundleKey]);

  useEffect(() => {
    if (!sessionId || hasMounted.current) return;

    const storedState = readStoredOutputState(sessionId);
    if (storedState?.mode === "passage") {
      setHasLiveOutput(true);
      setLiveBundleKey(getBundleKey(storedState.bundle));
    }

    const storedViewport = readStoredOutputViewport(sessionId);
    if (storedViewport) {
      setOutputViewport(storedViewport);
    }

    const stopViewport = subscribeToOutputViewport(sessionId, (viewport) => {
      setOutputViewport(viewport);
    });

    hasMounted.current = true;

    return () => stopViewport();
  }, [sessionId, getBundleKey]);

  const remoteUrl = useMemo(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/?session=${encodeURIComponent(sessionId || "")}`;
  }, [sessionId]);

  const statusText = bundle
    ? `${bundle.reference} · Page ${bundle.currentPageIndex + 1}/${bundle.pages.length}`
    : "Ready.";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Scripture Display
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Live Scripture Presentation Studio
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1">
              <span
                className={`h-2 w-2 rounded-full ${
                  isDisplayConnected ? "bg-emerald-500" : "bg-slate-500"
                }`}
              />
              <span
                className={`text-[11px] font-bold uppercase tracking-widest ${
                  isDisplayConnected ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {isDisplayConnected
                  ? "Display Connected"
                  : "Display Disconnected"}
              </span>
            </div>
          </div>

          <div className="hidden gap-3 xl:flex xl:shrink-0">
            <UtilityCard
              title="Display Settings"
              subtitle="Styling & Colors"
              actionLabel="Open"
              onOpen={() => setIsSettingsModalOpen(true)}
            />
            <UtilityCard
              title="Mobile Remote"
              subtitle="QR Controls"
              actionLabel="Open"
              onOpen={() => setIsRemoteModalOpen(true)}
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[430px,1fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium">
                  Bible Version
                </label>
                <select
                  value={version}
                  onChange={(e) =>
                    void loadPassage(activeReference, {
                      overrideVersion: e.target.value as BibleVersion,
                      autoSend: hasLiveOutput,
                    })
                  }
                  className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                >
                  {["KJV", "NLT", "NIV", "AMP", "MSG"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <ReferenceInput
                value={referenceInput}
                error={error || null}
                onChange={(v) => {
                  setReferenceInput(v);
                  setError("");
                }}
                onSubmit={handleSend}
              />

              {recentPassages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentPassages.map((ref) => (
                    <button
                      key={ref}
                      onClick={() => {
                        setReferenceInput(ref);
                        void loadPassage(ref, { autoSend: true });
                      }}
                      className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition hover:bg-slate-700 hover:text-white"
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 text-xs text-slate-400">{statusText}</div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                <Button
                  onClick={() =>
                    void loadPassage(referenceInput, { autoSend: false })
                  }
                  disabled={isLoading}
                >
                  Load
                </Button>

                <Button
                  onClick={handleSend}
                  disabled={isLoading || !sessionId}
                  style={{
                    backgroundColor: isActivelyLive ? "#10b981" : "",
                    borderColor: isActivelyLive ? "#059669" : "",
                  }}
                  className={`relative flex items-center justify-center transition-all ${
                    isActivelyLive ? LIVE_BUTTON_TAILWIND : ""
                  }`}
                >
                  <div className="relative flex w-full items-center justify-center">
                    {isActivelyLive && (
                      <div className="relative flex h-0 w-0 items-center justify-center">
                        <span className="absolute right-3 flex h-2 w-2 items-center justify-center">
                          <span className="absolute h-full w-full animate-ping rounded-full bg-white opacity-75" />
                          <span className="h-2 w-2 rounded-full bg-white" />
                        </span>
                      </div>
                    )}
                    <span className="text-center font-semibold">
                      {isActivelyLive ? "Live" : "Send"}
                    </span>
                  </div>
                </Button>

                <Button
                  onClick={() => sessionId && openDisplayWindow(sessionId)}
                  disabled={!sessionId}
                >
                  Open Output
                </Button>

                <Button onClick={clearScreen} disabled={!sessionId}>
                  Clear
                </Button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Button
                    onClick={() => void navigate("prev")}
                    disabled={!bundle || isLoading}
                  >
                    Prev
                  </Button>
                  <Button
                    onClick={() => void navigate("next")}
                    disabled={!bundle || isLoading}
                    className={hasMoreContent ? NEXT_GLOW_CLASSES : ""}
                  >
                    Next {hasMoreContent ? "Page" : ""}
                  </Button>
                </div>
              </div>

              <div className="mt-4 xl:hidden">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Preview</h2>
                  {isActivelyLive && (
                    <span className="animate-pulse rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Live
                    </span>
                  )}
                </div>
                <PreviewPanel bundle={bundle} error={error} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  onClick={clearScreen}
                  disabled={!sessionId}
                  className="text-[10px]"
                >
                  Clear
                </Button>
                <Button
                  onClick={() =>
                    publishOutputState({ mode: "black", theme }, sessionId)
                  }
                  disabled={!sessionId}
                  className="text-[10px]"
                >
                  Black
                </Button>
                <Button
                  onClick={() =>
                    publishOutputState({ mode: "white", theme }, sessionId)
                  }
                  disabled={!sessionId}
                  className="text-[10px]"
                >
                  White
                </Button>
              </div>
            </section>

            <MobileSettingsCard
              isOpen={showMobileSettings}
              onToggle={() => setShowMobileSettings((prev) => !prev)}
              theme={theme}
              onThemeChange={setTheme}
            />
          </div>

          <div className="hidden xl:block">
            <div className="mb-4 flex items-center gap-4">
              <h2 className="text-2xl font-bold tracking-tight">Preview</h2>
              {isActivelyLive && (
                <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">
                    Live on Screen
                  </span>
                </div>
              )}
            </div>

            <div
              className={`overflow-hidden rounded-xl transition-all duration-300 ${
                isActivelyLive ? "ring-2 ring-emerald-500/20" : ""
              }`}
            >
              <PreviewPanel bundle={bundle} error={error} />
            </div>
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />

      <MobileRemoteModal
        isOpen={isRemoteModalOpen}
        onClose={() => setIsRemoteModalOpen(false)}
        remoteUrl={remoteUrl}
      />
    </main>
  );
}