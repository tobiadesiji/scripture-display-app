import type { ParsedReference, Verse } from "@/types/scripture";
import { cleanNltHtmlToVerses } from "./cleanNltHtml";

type NltApiResponse = {
  ok?: boolean;
  raw?: string;
  error?: string;
  details?: string;
};

const rawCache = new Map<string, string>();
const verseCache = new Map<string, Verse[]>();

function makeCacheKey(reference: string, version: "NLT" | "KJV") {
  return `${version}:${reference.trim().toLowerCase()}`;
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

export async function fetchNltPassageText(
  reference: string,
  version: "NLT" | "KJV" = "NLT"
): Promise<string> {
  const cacheKey = makeCacheKey(reference, version);

  const cached = rawCache.get(cacheKey);
  if (cached) return cached;

  const url = new URL("/api/nlt-passages", window.location.origin);
  url.searchParams.set("ref", reference);
  url.searchParams.set("version", version);

  const response = await fetch(url.toString(), {
    cache: "no-store"
  });

  const data = (await response.json()) as NltApiResponse;

  if (!response.ok) {
    throw new Error(data.details || data.error || `NLT request failed with status ${response.status}`);
  }

  if (!data.raw) {
    throw new Error("NLT API returned no passage text.");
  }

  rawCache.set(cacheKey, data.raw);
  return data.raw;
}

export async function fetchNltVerses(
  reference: string,
  parsed: ParsedReference
): Promise<Verse[]> {
  const cacheKey = makeCacheKey(reference, "NLT");

  const cached = verseCache.get(cacheKey);
  if (cached) return cached;

  const raw = await fetchNltPassageText(reference, "NLT");
  const verses = dedupeAndSortVerses(cleanNltHtmlToVerses(raw, parsed.chapter));

  if (verses.length === 0) {
    throw new Error(`NLT passage returned no renderable verses. Raw response: ${raw.slice(0, 400)}`);
  }

  verseCache.set(cacheKey, verses);
  return verses;
}