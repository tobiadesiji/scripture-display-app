"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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
  publishPresentationCommand,
  readStoredOutputViewport,
  subscribeToOutputViewport,
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
};

const DEFAULT_VIEWPORT = { width: 1400, height: 900 };

function MobileRemoteCard({
  showRemotePanel,
  setShowRemotePanel,
  sessionId,
  remoteUrl,
}: {
  showRemotePanel: boolean;
  setShowRemotePanel: Dispatch<SetStateAction<boolean>>;
  sessionId: string;
  remoteUrl: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
      <button
        type="button"
        onClick={() => setShowRemotePanel((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-white">Mobile Remote</p>
          <p className="text-xs text-slate-400">
            Scan QR code to open the mobile control
          </p>
        </div>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {showRemotePanel ? "Hide" : "Show"}
        </span>
      </button>

      {showRemotePanel ? (
        <div className="border-t border-slate-800 px-4 py-4">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Session
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {sessionId}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex justify-center">
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG
                  value={remoteUrl}
                  size={180}
                  marginSize={2}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  title={`Mobile remote for session ${sessionId}`}
                />
              </div>
            </div>

            <p className="mt-4 break-all rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
              {remoteUrl}
            </p>
          </div>
        </div>
      ) : null}
    </div>
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
  const [isNavigatingVerse, setIsNavigatingVerse] = useState(false);
  const [outputViewport, setOutputViewport] = useState(DEFAULT_VIEWPORT);
  const [sessionId, setSessionId] = useState("");
  const [hasLiveOutput, setHasLiveOutput] = useState(false);
  const [showRemotePanel, setShowRemotePanel] = useState(false);

  const hasMounted = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const safeSession = ensureSessionInLocation();
    setSessionId(safeSession);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const stored = readStoredOutputViewport(sessionId);
    if (stored?.width && stored?.height) {
      setOutputViewport(stored);
    }

    return subscribeToOutputViewport(sessionId, (viewport) => {
      if (viewport.width > 0 && viewport.height > 0) {
        setOutputViewport(viewport);
      }
    });
  }, [sessionId]);

  const sendBundle = (nextBundle: PassageBundle | null, nextTheme = theme) => {
    if (!nextBundle || !sessionId) return;

    publishOutputState(
      {
        mode: "passage",
        bundle: nextBundle,
        theme: nextTheme,
      },
      sessionId,
    );

    setHasLiveOutput(true);
  };

  const clearEditingError = () => {
    if (error) setError("");
  };

  const loadPassage = async (
    submittedReference: string,
    options?: {
      autoSend?: boolean;
      overrideVersion?: BibleVersion;
      overrideTheme?: ThemeSettings;
      overrideViewport?: { width: number; height: number };
    },
  ) => {
    const parseResult: ParseReferenceResult =
      parseReferenceDetailed(submittedReference);

    if (!parseResult.ok) {
      setBundle(null);
      setError(parseResult.error.message);
      return null;
    }

    const parsed = parseResult.value;
    const effectiveVersion = options?.overrideVersion ?? version;
    const effectiveTheme = options?.overrideTheme ?? theme;
    const effectiveViewport = options?.overrideViewport ?? outputViewport;

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError("");

    try {
      let selected: Verse[] = [];
      let referenceLabel = "";

      if (effectiveVersion === "NLT") {
        selected = await fetchNltVerses(
          effectiveVersion,
          submittedReference,
          parsed,
        );
      } else {
        selected = await fetchApiBibleVerses(
          effectiveVersion,
          submittedReference,
          parsed,
        );
      }

      if (requestId !== requestIdRef.current) {
        return null;
      }

      if (!selected.length) {
        setBundle(null);
        setError(`That passage was not found in ${effectiveVersion}.`);
        return null;
      }

      referenceLabel = buildReferenceLabel(parsed, selected);

      const pages = paginatePassageMeasured(
        selected,
        effectiveTheme,
        effectiveViewport,
      );

      const nextBundle: PassageBundle = {
        reference: referenceLabel,
        translation: effectiveVersion,
        verses: selected,
        pages,
        currentPageIndex: 0,
      };

      setActiveReference(submittedReference);
      setBundle(nextBundle);
      setError("");

      if (options?.autoSend) {
        sendBundle(nextBundle, effectiveTheme);
      }

      return nextBundle;
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return null;
      }

      const message = err instanceof Error ? err.message : "Unknown error";
      setBundle(null);
      setError(message);
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!sessionId || hasMounted.current) return;
    hasMounted.current = true;
    void loadPassage(activeReference, { autoSend: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!hasMounted.current) return;
    if (!bundle) return;

    void loadPassage(activeReference, {
      autoSend: hasLiveOutput,
      overrideVersion: version,
      overrideTheme: theme,
      overrideViewport: outputViewport,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, outputViewport]);

  const handleSubmit = async (options?: { autoSend?: boolean }) => {
    const nextBundle = await loadPassage(referenceInput, options);
    if (options?.autoSend && nextBundle) {
      setHasLiveOutput(true);
    }
  };

  const handleVersionChange = async (nextVersion: BibleVersion) => {
    setVersion(nextVersion);

    const nextBundle = await loadPassage(activeReference, {
      autoSend: hasLiveOutput,
      overrideVersion: nextVersion,
      overrideTheme: theme,
      overrideViewport: outputViewport,
    });

    if (hasLiveOutput && nextBundle) {
      setHasLiveOutput(true);
    }
  };

  const updateCurrentPage = (direction: "prev" | "next") => {
    if (!bundle) return;

    const nextIndex =
      direction === "prev"
        ? Math.max(0, bundle.currentPageIndex - 1)
        : Math.min(bundle.pages.length - 1, bundle.currentPageIndex + 1);

    const nextBundle: PassageBundle = {
      ...bundle,
      currentPageIndex: nextIndex,
    };

    setBundle(nextBundle);
    sendBundle(nextBundle);
  };

const navigateVerse = async (direction: "prev" | "next") => {
  if (isNavigatingVerse || isLoading) return;

  const parseResult = parseReferenceDetailed(activeReference);
  if (!parseResult.ok) return;

  const current = parseResult.value;
  const currentVerse = current.startVerse ?? 1;

  setIsNavigatingVerse(true);

  try {
    let targetReference: string;

    if (direction === "next") {
      targetReference = `${current.book} ${current.chapter}:${currentVerse + 1}`;
    } else {
      if (currentVerse > 1) {
        targetReference = `${current.book} ${current.chapter}:${currentVerse - 1}`;
      } else if (current.chapter > 1) {
        targetReference = `${current.book} ${current.chapter - 1}:1`;
      } else {
        targetReference = `${current.book} ${current.chapter}:1`;
      }
    }

    const loaded = await loadPassage(targetReference, { autoSend: true });

    if (loaded) {
      setReferenceInput(targetReference);
      setActiveReference(targetReference);
      return;
    }

    if (direction === "next") {
      const nextChapterReference = `${current.book} ${current.chapter + 1}:1`;
      const nextChapterLoaded = await loadPassage(nextChapterReference, {
        autoSend: true,
      });

      if (nextChapterLoaded) {
        setReferenceInput(nextChapterReference);
        setActiveReference(nextChapterReference);
      }
    }
  } finally {
    setIsNavigatingVerse(false);
  }
};
  const statusText = isLoading
    ? `Loading ${version} passage...`
    : bundle
      ? `${bundle.reference} · ${bundle.verses.length} verse(s) · Page ${
          bundle.currentPageIndex + 1
        }/${bundle.pages.length} · Output ${outputViewport.width}×${outputViewport.height}`
      : "Load a passage to preview and send it to the output screen.";

  const remoteUrl = useMemo(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/?session=${encodeURIComponent(sessionId || "")}`;
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-8">
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Scripture Display
          </h1>
          <p className="text-slate-400">
            Hope Chapel Media Bible Display App for Zoom and Online Services.
          </p>
          <p className="text-sm text-slate-500">
            Enter now loads and sends. Mobile control and output are paired by
            session key.
          </p>
        </div>

        <div className="absolute right-0 top-0 z-20 hidden w-[360px] xl:block">
          <MobileRemoteCard
            showRemotePanel={showRemotePanel}
            setShowRemotePanel={setShowRemotePanel}
            sessionId={sessionId}
            remoteUrl={remoteUrl}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[430px,1fr] xl:pr-[390px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 xl:hidden">
                <MobileRemoteCard
                  showRemotePanel={showRemotePanel}
                  setShowRemotePanel={setShowRemotePanel}
                  sessionId={sessionId}
                  remoteUrl={remoteUrl}
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Bible Version
                </label>
                <select
                  value={version}
                  onChange={(event) => {
                    void handleVersionChange(
                      event.target.value as BibleVersion,
                    );
                  }}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"
                >
                  <option value="KJV">KJV</option>
                  <option value="NLT">NLT</option>
                  <option value="NIV">NIV</option>
                  <option value="AMP">AMP</option>
                  <option value="MSG">MSG</option>
                </select>
              </div>

              <ReferenceInput
                value={referenceInput}
                error={error || null}
                onChange={(value) => {
                  setReferenceInput(value);
                  clearEditingError();
                }}
                onSubmit={() => {
                  void handleSubmit({ autoSend: true });
                }}
              />

              <div className="mt-3 text-sm text-slate-400">{statusText}</div>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => void handleSubmit({ autoSend: true })}
                    disabled={isLoading}
                  >
                    {isLoading ? `Loading ${version}...` : "Load + Send"}
                  </Button>

                  <Button
                    onClick={() => sendBundle(bundle)}
                    disabled={!bundle || isLoading || !sessionId}
                  >
                    Send to Output
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => sessionId && openDisplayWindow(sessionId)}
                    disabled={!sessionId}
                  >
                    Open Output Window
                  </Button>

                  <Button
                    onClick={() =>
                      sessionId &&
                      publishPresentationCommand(
                        "toggle-fullscreen",
                        "control",
                        sessionId,
                      )
                    }
                    disabled={!sessionId}
                  >
                    Toggle Fullscreen
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Navigation
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button
                      onClick={() => void navigateVerse("prev")}
                      disabled={!bundle || isLoading || isNavigatingVerse}
                    >
                      Previous Verse
                    </Button>

                    <Button
                      onClick={() => void navigateVerse("next")}
                      disabled={!bundle || isLoading || isNavigatingVerse}
                    >
                      Next Verse
                    </Button>

                    <Button
                      onClick={() => updateCurrentPage("prev")}
                      disabled={!bundle || bundle.currentPageIndex <= 0}
                    >
                      Previous Page
                    </Button>

                    <Button
                      onClick={() => updateCurrentPage("next")}
                      disabled={
                        !bundle ||
                        bundle.currentPageIndex >= bundle.pages.length - 1
                      }
                    >
                      Next Page
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Screen Controls
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Button
                      onClick={() => {
                        if (!sessionId) return;
                        publishOutputState({ mode: "blank", theme }, sessionId);
                        setHasLiveOutput(false);
                      }}
                      disabled={!sessionId}
                    >
                      Clear Screen
                    </Button>

                    <Button
                      onClick={() => {
                        if (!sessionId) return;
                        publishOutputState({ mode: "black", theme }, sessionId);
                        setHasLiveOutput(false);
                      }}
                      disabled={!sessionId}
                    >
                      Black Screen
                    </Button>

                    <Button
                      onClick={() => {
                        if (!sessionId) return;
                        publishOutputState({ mode: "white", theme }, sessionId);
                        setHasLiveOutput(false);
                      }}
                      disabled={!sessionId}
                    >
                      White Screen
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
                KJV, NIV, AMP and MSG load through API.Bible. NLT loads through
                the NLT API. Cross-device remote sync is session-scoped through{" "}
                <code>/api/presentation</code>.
              </div>
            </section>

            <SettingsPanel theme={theme} onThemeChange={setTheme} />
          </div>

          <PreviewPanel bundle={bundle} error={error} />
        </div>
      </div>
    </main>
  );
}