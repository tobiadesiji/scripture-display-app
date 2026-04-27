"use client";

import { useCallback, useMemo, useState } from "react";
import { parseReferenceDetailed } from "@/lib/parseReference";
import type {
  BibleVersion,
  PassageBundle,
  ParsedReference,
  Verse,
} from "@/types/scripture";

type Props = {
  bundle: PassageBundle | null;
  error: string;
  controlTheme?: "dark" | "light";
};

type ScriptureApiResponse = {
  ok: boolean;
  verses?: Verse[];
  error?: string;
};

function getVerseId(verse: Verse) {
  return `${verse.chapter}:${verse.verse}`;
}

function getChapterParsedReference(bundle: PassageBundle): ParsedReference | null {
  const parsedFromReference = parseReferenceDetailed(bundle.reference);

  if (parsedFromReference.ok) {
    return {
      book: parsedFromReference.value.book,
      slug: parsedFromReference.value.slug,
      chapter: parsedFromReference.value.chapter,
    };
  }

  const firstVerse = bundle.verses[0];

  if (!firstVerse?.book || !firstVerse.chapter) {
    return null;
  }

  const parsedFromFirstVerse = parseReferenceDetailed(
    `${firstVerse.book} ${firstVerse.chapter}`,
  );

  if (!parsedFromFirstVerse.ok) {
    return null;
  }

  return {
    book: parsedFromFirstVerse.value.book,
    slug: parsedFromFirstVerse.value.slug,
    chapter: parsedFromFirstVerse.value.chapter,
  };
}

export default function PreviewPanel({
  bundle,
  error,
  controlTheme = "dark",
}: Props) {
  const isLight = controlTheme === "light";
  const currentPage = bundle ? bundle.pages[bundle.currentPageIndex] ?? [] : [];

  const [isChapterOpen, setIsChapterOpen] = useState(false);
  const [isChapterLoading, setIsChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState("");
  const [chapterReference, setChapterReference] = useState("");
  const [loadedChapterKey, setLoadedChapterKey] = useState("");
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);

  const selectedVerseIds = useMemo(() => {
    if (!bundle) return new Set<string>();
    return new Set(bundle.verses.map(getVerseId));
  }, [bundle]);

  const panelClass = isLight
    ? "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    : "brand-card-strong brand-glow-line p-5 sm:p-6";

  const titleClass = isLight
    ? "mt-2 text-xl font-bold tracking-tight text-slate-900"
    : "mt-2 text-xl font-bold tracking-tight text-white";

  const kickerClass = isLight
    ? "text-xs font-black uppercase tracking-[0.28em] text-emerald-600"
    : "brand-kicker";

  const previewSurfaceClass = isLight
    ? "mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-inner"
    : "mt-5 rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-inner";

  const previewTextClass = isLight
    ? "brand-scrollbar max-h-[56vh] space-y-4 overflow-y-auto pr-1 text-slate-900"
    : "brand-scrollbar max-h-[56vh] space-y-4 overflow-y-auto pr-1 text-slate-100";

  const emptyClass = isLight
    ? "mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm leading-6 text-slate-500"
    : "mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.035] px-5 py-8 text-center text-sm leading-6 text-slate-400";

  const pagePillClass = isLight
    ? "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600"
    : "brand-pill";

  const versionPillClass = isLight
    ? "inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700"
    : "brand-pill border-emerald-300/25 bg-emerald-300/10 text-emerald-200";

  const readMoreButtonClass = isLight
    ? "mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
    : "mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100 transition hover:border-emerald-200/40 hover:bg-emerald-300/15";

  const modalPanelClass = isLight
    ? "flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
    : "brand-card-strong flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden";

  const modalHeaderClass = isLight
    ? "flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6"
    : "flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6";

  const modalTitleClass = isLight
    ? "mt-2 text-2xl font-black tracking-tight text-slate-900"
    : "mt-2 text-2xl font-black tracking-tight text-white";

  const modalSubtitleClass = isLight
    ? "mt-1 text-sm text-slate-500"
    : "mt-1 text-sm text-slate-400";

  const closeButtonClass = isLight
    ? "rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
    : "rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.09]";

  const openChapterPopup = useCallback(async () => {
    if (!bundle) return;

    setIsChapterOpen(true);
    setChapterError("");

    const chapterParsed = getChapterParsedReference(bundle);

    if (!chapterParsed) {
      setChapterError("Unable to identify the full chapter for this passage.");
      return;
    }

    const nextChapterReference = `${chapterParsed.book} ${chapterParsed.chapter}`;
    const nextChapterKey = `${bundle.translation}:${nextChapterReference}`;

    setChapterReference(nextChapterReference);

    if (loadedChapterKey === nextChapterKey && chapterVerses.length > 0) {
      return;
    }

    setIsChapterLoading(true);

    try {
      const response = await fetch("/api/api-bible", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: bundle.translation as BibleVersion,
          reference: nextChapterReference,
          parsed: chapterParsed,
        }),
      });

      const data = (await response.json()) as ScriptureApiResponse;

      if (!response.ok || !data.ok || !data.verses?.length) {
        throw new Error(data.error || "Unable to load the full chapter.");
      }

      setChapterVerses(data.verses);
      setLoadedChapterKey(nextChapterKey);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Unable to load the full chapter.";

      setChapterError(message);
      setChapterVerses([]);
    } finally {
      setIsChapterLoading(false);
    }
  }, [bundle, chapterVerses.length, loadedChapterKey]);

  return (
    <>
      <section className={panelClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={kickerClass}>Output Preview</p>
            <h2 className={titleClass}>
              {bundle ? bundle.reference : "Ready for scripture"}
            </h2>

            {bundle ? (
              <button
                type="button"
                onClick={openChapterPopup}
                className={readMoreButtonClass}
              >
                Read more
                <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>

          {bundle ? (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className={versionPillClass}>{bundle.translation}</span>
              <span className={pagePillClass}>
                Page {bundle.currentPageIndex + 1}/{bundle.pages.length}
              </span>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3">
            <p className="text-sm font-bold text-red-100">
              Unable to load passage
            </p>
            <p className="mt-1 text-sm text-red-200/90">{error}</p>
          </div>
        ) : null}

        {!bundle && !error ? (
          <div className={emptyClass}>
            Search a passage to preview it here before sending it to the display
            window.
          </div>
        ) : null}

        {bundle ? (
          <div className={previewSurfaceClass}>
            <div className={previewTextClass}>
              {currentPage.map((verse, index) => (
                <p
                  key={`${verse.chapter}-${verse.verse}-${verse.label ?? ""}-${index}`}
                  className="text-lg leading-8 sm:text-xl sm:leading-9"
                >
                  <span className="mr-2 align-top text-sm font-bold text-emerald-500">
                    {verse.label ?? verse.verse}
                  </span>
                  <span>{verse.text}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {isChapterOpen ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-sm ${
            isLight ? "bg-slate-900/45" : "bg-black/75"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Full Bible chapter"
          onClick={() => setIsChapterOpen(false)}
        >
          <div
            className={modalPanelClass}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={modalHeaderClass}>
              <div>
                <p className={kickerClass}>Read More</p>
                <h3 className={modalTitleClass}>
                  {chapterReference || "Full chapter"}
                </h3>
                {bundle ? (
                  <p className={modalSubtitleClass}>
                    {bundle.translation} · selected passage highlighted
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setIsChapterOpen(false)}
                className={closeButtonClass}
              >
                Close
              </button>
            </div>

            <div className="brand-scrollbar overflow-y-auto px-5 py-5 sm:px-6">
              {isChapterLoading ? (
                <div
                  className={
                    isLight
                      ? "rounded-3xl border border-slate-200 bg-slate-50 px-5 py-10 text-center"
                      : "rounded-3xl border border-white/10 bg-white/[0.035] px-5 py-10 text-center"
                  }
                >
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-500">
                    Loading chapter...
                  </p>
                </div>
              ) : null}

              {chapterError ? (
                <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3">
                  <p className="text-sm font-bold text-red-100">
                    Unable to load chapter
                  </p>
                  <p className="mt-1 text-sm text-red-200/90">{chapterError}</p>
                </div>
              ) : null}

              {!isChapterLoading && !chapterError && chapterVerses.length > 0 ? (
                <div className="space-y-3">
                  {chapterVerses.map((verse, index) => {
                    const isSelected = selectedVerseIds.has(getVerseId(verse));

                    const verseClass = isLight
                      ? isSelected
                        ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base leading-7 text-slate-950 sm:text-lg sm:leading-8"
                        : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8"
                      : isSelected
                        ? "rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-base leading-7 text-white sm:text-lg sm:leading-8"
                        : "rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-base leading-7 text-slate-200 sm:text-lg sm:leading-8";

                    const numberClass = isSelected
                      ? "mr-2 align-top text-sm font-black text-emerald-500"
                      : isLight
                        ? "mr-2 align-top text-sm font-black text-slate-400"
                        : "mr-2 align-top text-sm font-black text-slate-500";

                    return (
                      <p
                        key={`${verse.chapter}-${verse.verse}-${verse.label ?? ""}-${index}`}
                        className={verseClass}
                      >
                        <span className={numberClass}>
                          {verse.label ?? verse.verse}
                        </span>
                        <span>{verse.text}</span>
                      </p>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}