import type { BibleVersion, ParsedReference, Verse } from "@/types/scripture";
import { loadBible } from "./loadBible";

type AdjacentResult = {
  reference: string;
};

type ScriptureApiResponse = {
  ok: boolean;
  verses?: Verse[];
  error?: string;
};

function formatReference(book: string, chapter: number, verse: number) {
  return `${book} ${chapter}:${verse}`;
}

async function fetchChapterVerses(
  version: BibleVersion,
  parsed: ParsedReference,
): Promise<Verse[]> {
  const chapterReference = `${parsed.book} ${parsed.chapter}`;

  if (version === "KJV") {
    const verses = await loadBible();

    return verses
      .filter(
        (verse) =>
          (verse.book ?? "").toLowerCase() === parsed.book.toLowerCase() &&
          verse.chapter === parsed.chapter,
      )
      .sort((a, b) => a.verse - b.verse);
  }

  const response = await fetch("/api/api-bible", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version,
      reference: chapterReference,
      parsed: {
        ...parsed,
        startVerse: undefined,
        endVerse: undefined,
      },
    }),
  });

  const data = (await response.json()) as ScriptureApiResponse;

  if (!response.ok || !data.ok || !data.verses?.length) {
    return [];
  }

  return [...data.verses].sort((a, b) => a.verse - b.verse);
}

function getBlockEnd(verses: Verse[], index: number): number {
  const current = verses[index];
  if (!current) return Number.POSITIVE_INFINITY;

  if (typeof current.endVerse === "number") {
    return current.endVerse;
  }

  const next = verses[index + 1];
  return next ? next.verse - 1 : Number.POSITIVE_INFINITY;
}

function findCurrentIndex(
  verses: Verse[],
  parsed: ParsedReference,
  version: BibleVersion,
): number {
  const currentVerse = parsed.startVerse ?? 1;

  if (version === "MSG") {
    const exactIndex = verses.findIndex((verse) => verse.verse === currentVerse);
    if (exactIndex !== -1) return exactIndex;

    return verses.findIndex((verse, index) => {
      const blockEnd = getBlockEnd(verses, index);
      return verse.verse <= currentVerse && blockEnd >= currentVerse;
    });
  }

  return verses.findIndex((verse) => verse.verse === currentVerse);
}

export async function getAdjacentVerseReference(
  parsed: ParsedReference,
  version: BibleVersion,
  direction: "prev" | "next",
): Promise<AdjacentResult | null> {
  const currentChapterVerses = await fetchChapterVerses(version, parsed);
  if (!currentChapterVerses.length) return null;

  const currentIndex = findCurrentIndex(currentChapterVerses, parsed, version);
  if (currentIndex === -1) return null;

  if (direction === "prev") {
    const previousInChapter = currentChapterVerses[currentIndex - 1];
    if (previousInChapter) {
      return {
        reference: formatReference(
          parsed.book,
          parsed.chapter,
          previousInChapter.verse,
        ),
      };
    }

    if (parsed.chapter <= 1) return null;

    const previousChapter = parsed.chapter - 1;
    const previousChapterVerses = await fetchChapterVerses(version, {
      ...parsed,
      chapter: previousChapter,
      startVerse: undefined,
      endVerse: undefined,
    });

    if (!previousChapterVerses.length) return null;

    const lastVerse = previousChapterVerses[previousChapterVerses.length - 1];
    if (!lastVerse) return null;

    return {
      reference: formatReference(parsed.book, previousChapter, lastVerse.verse),
    };
  }

  const nextInChapter = currentChapterVerses[currentIndex + 1];
  if (nextInChapter) {
    return {
      reference: formatReference(parsed.book, parsed.chapter, nextInChapter.verse),
    };
  }

  const nextChapter = parsed.chapter + 1;
  const nextChapterVerses = await fetchChapterVerses(version, {
    ...parsed,
    chapter: nextChapter,
    startVerse: undefined,
    endVerse: undefined,
  }).catch(() => []);

  if (!nextChapterVerses.length) return null;

  const firstVerse = nextChapterVerses[0];
  if (!firstVerse) return null;

  return {
    reference: formatReference(parsed.book, nextChapter, firstVerse.verse),
  };
}