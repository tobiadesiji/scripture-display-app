"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import PreviewPanel from "./PreviewPanel";
import ReferenceInput from "./ReferenceInput";
import SettingsPanel from "./SettingsPanel";
import { parseReference } from "@/lib/parseReference";
import { loadBible } from "@/lib/loadBible";
import { fetchNltVerses } from "@/lib/nltApi";
import { getPassageFromBible, buildReferenceLabel } from "@/lib/getPassage";
import { paginatePassageMeasured } from "@/lib/paginatePassageMeasured";
import { openDisplayWindow } from "@/lib/openDisplayWindow";
import {
  publishOutputState,
  readStoredOutputViewport,
  subscribeToOutputViewport
} from "@/lib/syncOutput";
import { getAdjacentVerseReference } from "@/lib/getAdjacentVerse";
import type { BibleVersion, PassageBundle, ThemeSettings, Verse } from "@/types/scripture";

const DEFAULT_THEME: ThemeSettings = {
  fontSize: 54,
  textAlign: "center",
  textColor: "#ffffff",
  backgroundColor: "#000000",
  lineHeight: 1.5,
  showReference: true
};

const DEFAULT_VIEWPORT = {
  width: 1400,
  height: 900
};

export default function ControlClient() {
  const [referenceInput, setReferenceInput] = useState("John 3:16-17");
  const [version, setVersion] = useState<BibleVersion>("KJV");
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [error, setError] = useState("");
  const [bundle, setBundle] = useState<PassageBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigatingVerse, setIsNavigatingVerse] = useState(false);
  const [outputViewport, setOutputViewport] = useState(DEFAULT_VIEWPORT);
  const [autoSendAfterLoad, setAutoSendAfterLoad] = useState(false);

  const parsed = useMemo(() => parseReference(referenceInput), [referenceInput]);

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
      theme
    });
  };

  useEffect(() => {
    let active = true;

    async function run() {
      if (!parsed) {
        setBundle(null);
        setError(referenceInput.trim() ? "Reference format not recognised." : "");
        setAutoSendAfterLoad(false);
        return;
      }

      setIsLoading(true);

      try {
        let selected: Verse[] = [];

        if (version === "KJV") {
          const verses = await loadBible();
          if (!active) return;

          selected = getPassageFromBible(verses, parsed);
        } else {
          selected = await fetchNltVerses(referenceInput, parsed);
          if (!active) return;
        }

        const pages = paginatePassageMeasured(selected, theme, outputViewport);

        const nextBundle: PassageBundle = {
          reference: buildReferenceLabel(parsed, selected),
          translation: version,
          verses: selected,
          pages,
          currentPageIndex: 0
        };

        const resolvedBundle = selected.length ? nextBundle : null;
        setBundle(resolvedBundle);

        if (selected.length === 0) {
          setError(`That passage was not found in ${version}.`);
          setAutoSendAfterLoad(false);
        } else {
          setError("");
        }

        if (autoSendAfterLoad && resolvedBundle) {
          sendBundle(resolvedBundle);
          if (active) {
            setAutoSendAfterLoad(false);
          }
        }
      } catch (err) {
        if (!active) return;

        setBundle(null);
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setAutoSendAfterLoad(false);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [parsed, version, theme, referenceInput, outputViewport, autoSendAfterLoad]);

  const updateCurrentPage = (direction: "prev" | "next") => {
    if (!bundle) return;

    const nextIndex =
      direction === "prev"
        ? Math.max(0, bundle.currentPageIndex - 1)
        : Math.min(bundle.pages.length - 1, bundle.currentPageIndex + 1);

    const nextBundle = {
      ...bundle,
      currentPageIndex: nextIndex
    };

    setBundle(nextBundle);
    sendBundle(nextBundle);
  };

  const navigateVerse = async (direction: "prev" | "next") => {
    if (!parsed || isNavigatingVerse) return;

    setIsNavigatingVerse(true);

    try {
      const result = await getAdjacentVerseReference(parsed, version, direction);
      if (result) {
        setAutoSendAfterLoad(true);
        setReferenceInput(result.reference);
      }
    } finally {
      setIsNavigatingVerse(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Scripture Display</h1>
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
                  onChange={(event) => setVersion(event.target.value as BibleVersion)}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"
                >
                  <option value="KJV">KJV</option>
                  <option value="NLT">NLT</option>
                </select>
              </div>

              <ReferenceInput
                value={referenceInput}
                onChange={(value) => {
                  setReferenceInput(value);
                  if (error) setError("");
                  setAutoSendAfterLoad(false);
                }}
                onSubmit={() => sendBundle(bundle)}
              />

              <div className="mt-3 text-sm text-slate-400">
                {isLoading
                  ? `Loading ${version}...`
                  : bundle
                    ? `${bundle.verses.length} verse(s) found · Page ${bundle.currentPageIndex + 1}/${bundle.pages.length} · Output ${outputViewport.width}×${outputViewport.height}`
                    : "No active passage"}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button onClick={() => openDisplayWindow()}>Open Output</Button>
                <Button onClick={() => sendBundle(bundle)} disabled={!bundle}>
                  Send to Output
                </Button>
                <Button onClick={() => publishOutputState({ mode: "blank", theme })}>
                  Clear
                </Button>
                <Button onClick={() => publishOutputState({ mode: "black", theme })}>
                  Black Screen
                </Button>
                <Button onClick={() => publishOutputState({ mode: "white", theme })}>
                  White Screen
                </Button>
                <Button onClick={() => setReferenceInput("Psalm 23")}>Load Psalm 23</Button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button
                  onClick={() => navigateVerse("prev")}
                  disabled={!parsed || isLoading || isNavigatingVerse}
                >
                  Previous Verse
                </Button>
                <Button
                  onClick={() => navigateVerse("next")}
                  disabled={!parsed || isLoading || isNavigatingVerse}
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
                  disabled={!bundle || bundle.currentPageIndex >= bundle.pages.length - 1}
                >
                  Next Page
                </Button>
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
                KJV loads from <code>public/data/KJV.json</code>. NLT loads through <code>/api/nlt-passages</code>.
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