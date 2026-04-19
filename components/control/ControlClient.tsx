"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import PreviewPanel from "./PreviewPanel";
import ReferenceInput from "./ReferenceInput";
import SettingsPanel from "./SettingsPanel";
import {
  parseReferenceDetailed,
  type ParseReferenceResult,
} from "@/lib/parseReference";
import { loadBible } from "@/lib/loadBible";
import { fetchNltVerses } from "@/lib/nltApi";
import { buildReferenceLabel } from "@/lib/getPassage";
import scriptureLookup from "@/lib/scriptureLookup";
import { paginatePassageMeasured } from "@/lib/paginatePassageMeasured";
import { openDisplayWindow } from "@/lib/openDisplayWindow";
import {
  publishOutputState,
  readStoredOutputViewport,
  subscribeToOutputViewport,
} from "@/lib/syncOutput";
import { getAdjacentVerseReference } from "@/lib/getAdjacentVerse";
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

const DEFAULT_VIEWPORT = {
  width: 1400,
  height: 900,
};

export default function ControlClient() {
  const [referenceInput, setReferenceInput] = useState("John 3:16-17");
  const [activeReference, setActiveReference] = useState("John 3:16-17");
  const [version, setVersion] = useState<BibleVersion>("KJV");
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [error, setError] = useState("");
  const [bundle, setBundle] = useState<PassageBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigatingVerse, setIsNavigatingVerse] = useState(false);
  const [outputViewport, setOutputViewport] = useState(DEFAULT_VIEWPORT);
  const [autoSendAfterLoad, setAutoSendAfterLoad] = useState(false);

  useEffect(() => {
    const stored = readStoredOutputViewport();

    if (stored?.width && stored?.height) {
      setOutputViewport(stored);
    }

    return subscribeToOutputViewport((viewport) => {
      if (viewport.width > 0 && viewport.height > 0) {
        setOutputViewport(viewport);
      }
    });
  }, []);

  const sendBundle = (nextBundle: PassageBundle | null) => {
    if (!nextBundle) return;

    publishOutputState({
      mode: "passage",
      bundle: nextBundle,
      theme,
    });
  };

  const clearEditingError = () => {
    if (error) {
      setError("");
    }
    setAutoSendAfterLoad(false);
  };

  const loadPassage = async (
    submittedReference: string,
    options?: { autoSend?: boolean },
  ) => {
    const parseResult: ParseReferenceResult =
      parseReferenceDetailed(submittedReference);

    if (!parseResult.ok) {
      setBundle(null);
      setError(parseResult.error.message);
      setAutoSendAfterLoad(false);
      return;
    }

    const parsed = parseResult.value;

    setIsLoading(true);
    setError("");

    try {
      let selected: Verse[] = [];
      let referenceLabel = "";

      if (version === "KJV") {
        const verses = await loadBible();
        const lookup = scriptureLookup(verses, parsed);

        if (!lookup.ok) {
          setBundle(null);
          setError(lookup.message);
          setAutoSendAfterLoad(false);
          return;
        }

        selected = lookup.verses;
        referenceLabel = lookup.reference;
      } else {
        selected = await fetchNltVerses(submittedReference, parsed);

        if (!selected.length) {
          setBundle(null);
          setError(`That passage was not found in ${version}.`);
          setAutoSendAfterLoad(false);
          return;
        }

        referenceLabel = buildReferenceLabel(parsed, selected);
      }

      const pages = paginatePassageMeasured(selected, theme, outputViewport);

      const nextBundle: PassageBundle = {
        reference: referenceLabel,
        translation: version,
        verses: selected,
        pages,
        currentPageIndex: 0,
      };

      setActiveReference(submittedReference);
      setBundle(nextBundle);
      setError("");

      if (options?.autoSend) {
        sendBundle(nextBundle);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setBundle(null);
      setError(message);
      setAutoSendAfterLoad(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPassage(activeReference, { autoSend: autoSendAfterLoad });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, theme, outputViewport]);

  const handleSubmit = async () => {
    await loadPassage(referenceInput);
  };

  const handleQuickLoad = async (reference: string) => {
    setReferenceInput(reference);
    await loadPassage(reference);
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
    const parseResult = parseReferenceDetailed(activeReference);

    if (!parseResult.ok || isNavigatingVerse) return;

    setIsNavigatingVerse(true);

    try {
      const result = await getAdjacentVerseReference(
        parseResult.value,
        version,
        direction,
      );

      if (result) {
        setReferenceInput(result.reference);
        setActiveReference(result.reference);
        setAutoSendAfterLoad(true);
        await loadPassage(result.reference, { autoSend: true });
      }
    } finally {
      setIsNavigatingVerse(false);
      setAutoSendAfterLoad(false);
    }
  };

  const statusText = isLoading
    ? `Loading ${version} passage...`
    : bundle
      ? `${bundle.reference} · ${bundle.verses.length} verse(s) · Page ${
          bundle.currentPageIndex + 1
        }/${bundle.pages.length} · Output ${outputViewport.width}×${
          outputViewport.height
        }`
      : "Load a passage to preview and send it to the output screen.";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Scripture Display
          </h1>
          <p className="text-slate-400">
            Hope Chapel Media Bible Display App for Zoom and Online Services.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[430px,1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Bible Version
                </label>
                <select
                  value={version}
                  onChange={(event) =>
                    setVersion(event.target.value as BibleVersion)
                  }
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"
                >
                  <option value="KJV">KJV</option>
                  <option value="NLT">NLT</option>
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
                  void handleSubmit();
                }}
              />

              <div className="mt-3 text-sm text-slate-400">{statusText}</div>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button onClick={() => void handleSubmit()} disabled={isLoading}>
                    {isLoading ? `Loading ${version}...` : "Load Passage"}
                  </Button>

                  <Button onClick={() => sendBundle(bundle)} disabled={!bundle || isLoading}>
                    Send to Output
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3">
  <Button onClick={() => openDisplayWindow()}>
    Open Output Window
  </Button>
</div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Screen Controls
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Button onClick={() => publishOutputState({ mode: "blank", theme })}>
                      Clear Screen
                    </Button>
                    <Button onClick={() => publishOutputState({ mode: "black", theme })}>
                      Black Screen
                    </Button>
                    <Button onClick={() => publishOutputState({ mode: "white", theme })}>
                      White Screen
                    </Button>
                  </div>
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
                        !bundle || bundle.currentPageIndex >= bundle.pages.length - 1
                      }
                    >
                      Next Page
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
                KJV loads from <code>public/data/KJV.json</code>. NLT loads
                through <code>/api/nlt-passages</code>.
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