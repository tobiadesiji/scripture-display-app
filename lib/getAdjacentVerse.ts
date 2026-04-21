import type { BibleVersion, ParsedReference, Verse } from "@/types/scripture";
import { loadBible } from "./loadBible";
import { fetchNltVerses } from "./nltApi";
import { fetchApiBibleVerses } from "./apiBible";

type AdjacentResult = {
  reference: string;
};

function formatReference(book: string, chapter: number, verse: number) {
  return `${book} ${chapter}:${verse}`;
}

async function fetchChapterVerses(
  version: BibleVersion,
  parsed: ParsedReference,
): Promise<Verse[]> {
  const chapterReference = `${parsed.book} ${parsed.chapter}`;

  if (version === "NLT") {
    return fetchNltVerses(version, chapterReference, {
      ...parsed,
      startVerse: undefined,
      endVerse: undefined,
    });
  }

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

  return fetchApiBibleVerses(version, chapterReference, {
    ...parsed,
    startVerse: undefined,
    endVerse: undefined,
  });
}

export async function getAdjacentVerseReference(
  parsed: ParsedReference,
  version: BibleVersion,
  direction: "prev" | "next",
): Promise<AdjacentResult | null> {
  const currentVerse = parsed.startVerse ?? 1;

  const currentChapterVerses = await fetchChapterVerses(version, parsed);
  if (!currentChapterVerses.length) return null;

  const currentIndex = currentChapterVerses.findIndex(
    (verse) => verse.verse === currentVerse,
  );

  if (currentIndex === -1) return null;

  if (direction === "prev") {
    const previousInChapter = currentChapterVerses[currentIndex - 1];
    if (previousInChapter) {
      return {
        reference: formatReference(parsed.book, parsed.chapter, previousInChapter.verse),
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