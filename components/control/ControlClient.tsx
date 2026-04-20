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
  readStoredOutputState,
  readStoredOutputViewport,
  subscribeToOutputState,
  subscribeToOutputViewport,
} from "@/lib/syncOutput";
import { getAdjacentVerseReference } from "@/lib/getAdjacentVerse";
import { ensureSessionInLocation } from "@/lib/session";
import type {
  BibleVersion,
  OutputState,
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

// --- Sub-components ---

function UtilityCard({ title, subtitle, actionLabel, onOpen }: { title: string; subtitle: string; actionLabel: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-left transition hover:border-slate-700 hover:bg-slate-800/80">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-white">{title}</p>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <span className="shrink-0 text-sm uppercase tracking-wide text-slate-400">{actionLabel}</span>
      </div>
    </button>
  );
}

function MobileRemoteModal({ isOpen, onClose, sessionId, remoteUrl }: { isOpen: boolean; onClose: () => void; sessionId: string; remoteUrl: string }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div><h2 className="text-xl font-semibold text-white">Mobile Remote</h2><p className="mt-1 text-sm text-slate-400">Scan QR code for session control</p></div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">Close</button>
        </div>
        <div className="px-5 py-5 text-center">
          <div className="bg-white p-3 rounded-xl inline-block mb-4"><QRCodeSVG value={remoteUrl} size={180} /></div>
          <p className="break-all text-xs text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">{remoteUrl}</p>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ isOpen, onClose, theme, onThemeChange }: { isOpen: boolean; onClose: () => void; theme: ThemeSettings; onThemeChange: (theme: ThemeSettings) => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div><h2 className="text-xl font-semibold text-white">Display Settings</h2><p className="mt-1 text-sm text-slate-400">Font, text styling, and colors</p></div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">Close</button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6"><SettingsPanel theme={theme} onThemeChange={onThemeChange} /></div>
      </div>
    </div>
  );
}

function MobileSettingsCard({ isOpen, onToggle, theme, onThemeChange }: { isOpen: boolean; onToggle: () => void; theme: ThemeSettings; onThemeChange: (theme: ThemeSettings) => void }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 xl:hidden overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center justify-between px-4 py-4 text-left">
        <div><p className="text-base font-semibold text-white">Display Settings</p><p className="mt-1 text-xs text-slate-400">Colors, fonts, and layout</p></div>
        <span className="text-xs uppercase tracking-wide text-slate-400">{isOpen ? "Hide" : "Show"}</span>
      </button>
      {isOpen && <div className="border-t border-slate-800 p-4"><SettingsPanel theme={theme} onThemeChange={onThemeChange} /></div>}
    </section>
  );
}

// --- Main ControlClient ---

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

  const hasMoreContent = useMemo(() => {
    if (!bundle) return false;
    return bundle.currentPageIndex < bundle.pages.length - 1;
  }, [bundle]);

  const addToHistory = useCallback((ref: string) => {
    setRecentPassages(prev => {
      const filtered = prev.filter(p => p !== ref);
      return [ref, ...filtered].slice(0, 5);
    });
  }, []);

  const sendBundle = useCallback((nextBundle: PassageBundle | null, nextTheme = theme) => {
    if (!nextBundle || !sessionId) return;
    publishOutputState({ mode: "passage", bundle: nextBundle, theme: nextTheme }, sessionId);
    setHasLiveOutput(true);
    setLiveBundleKey(getBundleKey(nextBundle));
  }, [sessionId, theme, getBundleKey]);

  const loadPassage = async (submittedReference: string, options?: { autoSend?: boolean; overrideVersion?: BibleVersion }) => {
    const parseResult: ParseReferenceResult = parseReferenceDetailed(submittedReference);
    if (!parseResult.ok) { setBundle(null); setError(parseResult.error.message); return null; }

    const requestId = ++requestIdRef.current;
    setIsLoading(true); setError("");

    try {
      const v = options?.overrideVersion ?? version;
      let selected: Verse[] = [];
      if (v === "NLT") selected = await fetchNltVerses(v, submittedReference, parseResult.value);
      else selected = await fetchApiBibleVerses(v, submittedReference, parseResult.value);

      if (requestId !== requestIdRef.current) return null;
      if (!selected.length) { setBundle(null); setError(`Not found in ${v}.`); return null; }

      const nextBundle: PassageBundle = {
        reference: buildReferenceLabel(parseResult.value, selected),
        translation: v,
        verses: selected,
        pages: paginatePassageMeasured(selected, theme, outputViewport),
        currentPageIndex: 0,
      };

      setActiveReference(submittedReference);
      setBundle(nextBundle);
      addToHistory(nextBundle.reference);
      if (options?.autoSend) sendBundle(nextBundle);
      return nextBundle;
    } catch (err) {
      setError("Error loading passage."); return null;
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  const clearScreen = useCallback(() => {
    if (!sessionId) return;
    publishOutputState({ mode: "blank", theme }, sessionId);
    setHasLiveOutput(false);
    setLiveBundleKey("");
  }, [sessionId, theme]);

  // RESTORED: Centralized logic for the "Send/Live" button
  const handleSend = useCallback(async () => {
    await loadPassage(referenceInput, { autoSend: true });
  }, [referenceInput, loadPassage]);

  const navigate = useCallback(async (direction: "prev" | "next") => {
    if (!bundle || isLoading || isNavigating) return;
    const hasPrev = bundle.currentPageIndex > 0;
    const hasNext = bundle.currentPageIndex < bundle.pages.length - 1;

    if (direction === "prev" && hasPrev) {
      const n = { ...bundle, currentPageIndex: bundle.currentPageIndex - 1 };
      setBundle(n); sendBundle(n); return;
    }
    if (direction === "next" && hasNext) {
      const n = { ...bundle, currentPageIndex: bundle.currentPageIndex + 1 };
      setBundle(n); sendBundle(n); return;
    }

    const parseResult = parseReferenceDetailed(activeReference);
    if (!parseResult.ok) return;
    setIsNavigating(true);
    try {
      const res = await getAdjacentVerseReference(parseResult.value, version, direction);
      if (res) {
        const loaded = await loadPassage(res.reference, { autoSend: true });
        if (loaded) { setReferenceInput(res.reference); setActiveReference(res.reference); }
      }
    } finally { setIsNavigating(false); }
  }, [bundle, isLoading, isNavigating, activeReference, version, sendBundle, loadPassage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      switch (e.code) {
        case "Space": e.preventDefault(); handleSend(); break; // Space now triggers the restored handleSend
        case "ArrowRight": navigate("next"); break;
        case "ArrowLeft": navigate("prev"); break;
        case "Escape": clearScreen(); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bundle, handleSend, navigate, clearScreen]);

  useEffect(() => {
    const safeSession = ensureSessionInLocation();
    setSessionId(safeSession);
  }, []);

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
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Scripture Display</h1>
            <p className="mt-2 text-sm text-slate-400">Professional Media Controller</p>
          </div>
          <div className="hidden gap-3 xl:flex xl:shrink-0">
            <UtilityCard title="Display Settings" subtitle="Styling & Colors" actionLabel="Open" onOpen={() => setIsSettingsModalOpen(true)} />
            <UtilityCard title="Mobile Remote" subtitle="QR Controls" actionLabel="Open" onOpen={() => setIsRemoteModalOpen(true)} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[430px,1fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium">Bible Version</label>
                <select value={version} onChange={(e) => void loadPassage(activeReference, { overrideVersion: e.target.value as BibleVersion, autoSend: hasLiveOutput })} className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white">
                  {["KJV", "NLT", "NIV", "AMP", "MSG"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <ReferenceInput value={referenceInput} error={error || null} onChange={(v) => { setReferenceInput(v); setError(""); }} onSubmit={() => void handleSend()} />
              
              {recentPassages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentPassages.map((ref) => (
                    <button key={ref} onClick={() => { setReferenceInput(ref); loadPassage(ref, { autoSend: true }); }} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">{ref}</button>
                  ))}
                </div>
              )}

              <div className="mt-3 text-xs text-slate-400">{statusText}</div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                <Button onClick={() => void loadPassage(referenceInput, { autoSend: false })} disabled={isLoading}>Load</Button>
                
                {/* Send Button restored to trigger full handleSend logic */}
                <Button 
                  onClick={handleSend} 
                  disabled={isLoading || !sessionId} 
                  className={`relative flex items-center justify-center ${isCurrentPreviewLive ? "border-emerald-600 bg-emerald-600" : ""}`}
                >
                    <div className="flex items-center justify-center w-full relative">
                      {isCurrentPreviewLive && <span className="absolute left-0 h-2 w-2 rounded-full bg-white animate-pulse" />}
                      <span className="mx-auto text-center">{isCurrentPreviewLive ? "Live" : "Send"}</span>
                    </div>
                </Button>
                <Button onClick={() => sessionId && openDisplayWindow(sessionId)} disabled={!sessionId}>Open Output</Button>
                <Button onClick={clearScreen} disabled={!sessionId}>Clear</Button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Button onClick={() => void navigate("prev")} disabled={!bundle || isLoading}>Prev</Button>
                  <Button onClick={() => void navigate("next")} disabled={!bundle || isLoading} className={hasMoreContent ? "ring-2 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.4)] animate-pulse" : ""}>Next {hasMoreContent && "Page"}</Button>
                </div>
              </div>

              <div className="mt-4 xl:hidden">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">Preview</h2>
                  {isCurrentPreviewLive && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold uppercase tracking-wider animate-pulse">Live</span>}
                </div>
                <PreviewPanel bundle={bundle} error={error} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button onClick={clearScreen} disabled={!sessionId} className="text-[10px]">Clear</Button>
                <Button onClick={() => publishOutputState({ mode: "black", theme }, sessionId)} disabled={!sessionId} className="text-[10px]">Black</Button>
                <Button onClick={() => publishOutputState({ mode: "white", theme }, sessionId)} disabled={!sessionId} className="text-[10px]">White</Button>
              </div>
            </section>

            <MobileSettingsCard 
              isOpen={showMobileSettings} 
              onToggle={() => setShowMobileSettings(!showMobileSettings)} 
              theme={theme} 
              onThemeChange={setTheme} 
            />
          </div>

          <div className="hidden xl:block">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl font-bold tracking-tight">Preview</h2>
              {isCurrentPreviewLive && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Live on Screen</span>
                </div>
              )}
            </div>
            <div className={`transition-all duration-300 rounded-xl overflow-hidden ${isCurrentPreviewLive ? "ring-2 ring-emerald-500/20" : ""}`}>
              <PreviewPanel bundle={bundle} error={error} />
            </div>
          </div>
        </div>
      </div>

      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} theme={theme} onThemeChange={setTheme} />
      <MobileRemoteModal isOpen={isRemoteModalOpen} onClose={() => setIsRemoteModalOpen(false)} sessionId={sessionId} remoteUrl={remoteUrl} />
    </main>
  );
}