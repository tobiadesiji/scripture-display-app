import type { BibleVersion, ParsedReference, Verse } from "@/types/scripture";
import { cleanNltHtmlToVerses } from "./cleanNltHtml";

type NltApiResponse = {
  ok?: boolean;
  raw?: string;
  verses?: Verse[];
  error?: string;
  details?: string;
};

const chapterVerseCache = new Map<string, Verse[]>();

function makeChapterCacheKey(parsed: ParsedReference) {
  return `NLT:chapter:${parsed.book.trim().toLowerCase()}:${parsed.chapter}`;
}

function dedupeAndSortVerses(verses: Verse[]): Verse[] {
  const map = new Map<number, Verse>();

  for (const verse of verses) {
    if (!map.has(verse.verse)) {
      map.set(verse.verse, verse);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.verse - b.verse);
}

function makeChapterReference(parsed: ParsedReference) {
  return `${parsed.book} ${parsed.chapter}`;
}

function sliceVersesForReference(
  verses: Verse[],
  parsed: ParsedReference,
): Verse[] {
  return verses.filter((verse) => {
    if (parsed.startVerse !== undefined && verse.verse < parsed.startVerse) return false;
    if (parsed.endVerse !== undefined && verse.verse > parsed.endVerse) return false;
    return true;
  });
}

export async function fetchNltVerses(
  version: BibleVersion,
  reference: string,
  parsed: ParsedReference,
): Promise<Verse[]> {
  if (version !== "NLT") {
    throw new Error(`Unsupported NLT version request: ${version}`);
  }

  const chapterCacheKey = makeChapterCacheKey(parsed);
  const cachedChapter = chapterVerseCache.get(chapterCacheKey);

  if (cachedChapter?.length) {
    const sliced = sliceVersesForReference(cachedChapter, parsed);
    if (sliced.length) return sliced;
  }

  const chapterReference = makeChapterReference(parsed);
  const url = new URL("/api/nlt-passages", window.location.origin);
  url.searchParams.set("ref", chapterReference);
  url.searchParams.set("version", "NLT");

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  const data = (await response.json()) as NltApiResponse;

  if (!response.ok) {
    throw new Error(
      data.details ||
        data.error ||
        `NLT request failed with status ${response.status}.`,
    );
  }

  let chapterVerses: Verse[] = [];

  if (data.verses?.length) {
    chapterVerses = dedupeAndSortVerses(data.verses);
  } else if (data.raw) {
    chapterVerses = dedupeAndSortVerses(
      cleanNltHtmlToVerses(data.raw, parsed.chapter),
    );
  }

  if (!chapterVerses.length) {
    throw new Error("NLT passage returned no renderable verses.");
  }

  chapterVerseCache.set(chapterCacheKey, chapterVerses);

  const verses = sliceVersesForReference(chapterVerses, parsed);

  if (!verses.length) {
    throw new Error("That passage was not found in NLT.");
  }

  return verses;
}