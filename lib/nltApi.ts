import type { BibleVersion, ParsedReference, Verse } from "@/types/scripture";
import { cleanNltHtmlToVerses } from "./cleanNltHtml";

type NltApiResponse = {
  ok?: boolean;
  raw?: string;
  error?: string;
  details?: string;
};

const rawCache = new Map<string, string>();
const verseCache = new Map<string, Verse[]>();

function makeRawCacheKey(reference: string) {
  return `NLT:raw:${reference.trim().toLowerCase()}`;
}

function makeVerseCacheKey(reference: string) {
  return `NLT:verses:${reference.trim().toLowerCase()}`;
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
    if (parsed.startVerse && verse.verse < parsed.startVerse) return false;
    if (parsed.endVerse && verse.verse > parsed.endVerse) return false;
    return true;
  });
}

export async function fetchNltPassageText(reference: string): Promise<string> {
  const cacheKey = makeRawCacheKey(reference);
  const cached = rawCache.get(cacheKey);
  if (cached) return cached;

  const url = new URL("/api/nlt-passages", window.location.origin);
  url.searchParams.set("ref", reference);
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

  if (!data.raw) {
    throw new Error("NLT API returned no passage text.");
  }

  rawCache.set(cacheKey, data.raw);
  return data.raw;
}

export async function fetchNltVerses(
  version: BibleVersion,
  reference: string,
  parsed: ParsedReference,
): Promise<Verse[]> {
  if (version !== "NLT") {
    throw new Error(`Unsupported NLT version request: ${version}`);
  }

  const cacheKey = makeVerseCacheKey(reference);
  const cached = verseCache.get(cacheKey);
  if (cached) return cached;

  const chapterReference = makeChapterReference(parsed);
  const raw = await fetchNltPassageText(chapterReference);

  const chapterVerses = dedupeAndSortVerses(
    cleanNltHtmlToVerses(raw, parsed.chapter),
  );

  if (chapterVerses.length === 0) {
    throw new Error(
      `NLT passage returned no renderable verses. Raw response: ${raw.slice(0, 400)}`,
    );
  }

  const verses = sliceVersesForReference(chapterVerses, parsed);

  if (verses.length === 0) {
    throw new Error("That passage was not found in NLT.");
  }

  verseCache.set(cacheKey, verses);
  return verses;
}