import type { BibleVersion, ParsedReference, Verse } from "@/types/scripture";
import { loadBible } from "./loadBible";
import { fetchNltVerses } from "./nltApi";

type AdjacentResult = {
  reference: string;
};

function formatReference(book: string, chapter: number, verse: number) {
  return `${book} ${chapter}:${verse}`;
}

export async function getAdjacentVerseReference(
  parsed: ParsedReference,
  version: BibleVersion,
  direction: "prev" | "next"
): Promise<AdjacentResult | null> {
  if (version === "KJV") {
    const verses = await loadBible();
    const bookVerses = verses
      .filter((verse) => (verse.book ?? "").toLowerCase() === parsed.book.toLowerCase())
      .sort((a, b) => {
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return a.verse - b.verse;
      });

    const targetVerse = parsed.startVerse ?? 1;
    const index = bookVerses.findIndex(
      (verse) => verse.chapter === parsed.chapter && verse.verse === targetVerse
    );

    if (index === -1) return null;

    const nextIndex = direction === "prev" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= bookVerses.length) return null;

    const nextVerse = bookVerses[nextIndex];
    return {
      reference: formatReference(parsed.book, nextVerse.chapter, nextVerse.verse)
    };
  }

  const currentVerse = parsed.startVerse ?? 1;

  if (direction === "prev") {
    if (currentVerse > 1) {
      return {
        reference: formatReference(parsed.book, parsed.chapter, currentVerse - 1)
      };
    }

    if (parsed.chapter <= 1) return null;

    const previousChapter = parsed.chapter - 1;
    const previousChapterReference = `${parsed.book} ${previousChapter}`;
    const previousChapterVerses = await fetchNltVerses(previousChapterReference, {
      ...parsed,
      chapter: previousChapter,
      startVerse: undefined,
      endVerse: undefined
    });

    if (previousChapterVerses.length === 0) return null;

    const lastVerse = previousChapterVerses[previousChapterVerses.length - 1];
    return {
      reference: formatReference(parsed.book, previousChapter, lastVerse.verse)
    };
  }

  const nextVerseReference = formatReference(parsed.book, parsed.chapter, currentVerse + 1);

  try {
    const nextVerseResult = await fetchNltVerses(nextVerseReference, {
      ...parsed,
      chapter: parsed.chapter,
      startVerse: currentVerse + 1,
      endVerse: currentVerse + 1
    });

    if (nextVerseResult.length > 0) {
      return { reference: nextVerseReference };
    }
  } catch {}

  const nextChapter = parsed.chapter + 1;
  const nextChapterFirstVerseReference = formatReference(parsed.book, nextChapter, 1);

  try {
    const nextChapterResult = await fetchNltVerses(nextChapterFirstVerseReference, {
      ...parsed,
      chapter: nextChapter,
      startVerse: 1,
      endVerse: 1
    });

    if (nextChapterResult.length > 0) {
      return { reference: nextChapterFirstVerseReference };
    }
  } catch {}

  return null;
}