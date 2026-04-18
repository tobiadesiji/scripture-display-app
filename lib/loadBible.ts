import type { Verse } from "@/types/scripture";

type RawBibleMap = Record<string, string>;

let cachedBible: Verse[] | null = null;

function parseReferenceKey(reference: string): Verse | null {
  const match = reference.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) return null;

  const [, book, chapterStr, verseStr] = match;

  const chapter = Number(chapterStr);
  const verse = Number(verseStr);

  if (!Number.isInteger(chapter) || !Number.isInteger(verse)) {
    return null;
  }

  return {
    book,
    chapter,
    verse,
    text: ""
  };
}

export async function loadBible(): Promise<Verse[]> {
  if (cachedBible) return cachedBible;

  const response = await fetch("/data/KJV.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load KJV.json");
  }

  const raw = (await response.json()) as RawBibleMap;
  const verses: Verse[] = [];

  for (const [reference, rawText] of Object.entries(raw)) {
    const parsed = parseReferenceKey(reference);
    if (!parsed) continue;

    verses.push({
      ...parsed,
      text: String(rawText).replace(/^#\s*/, "").trim()
    });
  }

  verses.sort((a, b) => {
    const bookCompare = (a.book ?? "").localeCompare(b.book ?? "");
    if (bookCompare !== 0) return bookCompare;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  cachedBible = verses;
  return verses;
}