import { promises as fs } from "fs";
import path from "path";
import type { BibleVersion, Verse } from "@/types/scripture";

type CacheEntry = {
  version: BibleVersion;
  book: string;
  chapter: number;
  verses: Verse[];
  fetchedAt: string;
  source: "nlt" | "api-bible";
};

const memoryCache = new Map<string, CacheEntry>();

const CACHE_ROOT =
  process.env.SCRIPTURE_CACHE_DIR || path.join(process.cwd(), "data", "scripture-cache");

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeChapterKey(version: BibleVersion, book: string, chapter: number) {
  return `${version}:${sanitizeSegment(book)}:${chapter}`;
}

function makeCacheFilePath(version: BibleVersion, book: string, chapter: number) {
  const safeBook = sanitizeSegment(book);
  return path.join(CACHE_ROOT, version, safeBook, `${chapter}.json`);
}

export function filterVersesForRange(
  verses: Verse[],
  startVerse?: number,
  endVerse?: number,
): Verse[] {
  if (startVerse === undefined) {
    return [...verses].sort((a, b) => a.verse - b.verse);
  }

  const upper = endVerse ?? startVerse;

  return verses
    .filter((verse) => verse.verse >= startVerse && verse.verse <= upper)
    .sort((a, b) => a.verse - b.verse);
}

export async function readChapterCache(
  version: BibleVersion,
  book: string,
  chapter: number,
): Promise<CacheEntry | null> {
  const key = makeChapterKey(version, book, chapter);
  const fromMemory = memoryCache.get(key);
  if (fromMemory) return fromMemory;

  const filePath = makeCacheFilePath(version, book, chapter);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as CacheEntry;

    if (!parsed?.verses?.length) {
      return null;
    }

    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeChapterCache(entry: CacheEntry): Promise<void> {
  const key = makeChapterKey(entry.version, entry.book, entry.chapter);
  const filePath = makeCacheFilePath(entry.version, entry.book, entry.chapter);

  memoryCache.set(key, entry);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(entry, null, 2), "utf8");
}

export async function getCachedVersesForReference(
  version: BibleVersion,
  book: string,
  chapter: number,
  startVerse?: number,
  endVerse?: number,
): Promise<Verse[] | null> {
  const cached = await readChapterCache(version, book, chapter);
  if (!cached) return null;

  const sliced = filterVersesForRange(cached.verses, startVerse, endVerse);
  return sliced.length ? sliced : null;
}

export function setMemoryChapterCache(
  version: BibleVersion,
  book: string,
  chapter: number,
  verses: Verse[],
  source: "nlt" | "api-bible",
) {
  const entry: CacheEntry = {
    version,
    book,
    chapter,
    verses: [...verses].sort((a, b) => a.verse - b.verse),
    fetchedAt: new Date().toISOString(),
    source,
  };

  const key = makeChapterKey(version, book, chapter);
  memoryCache.set(key, entry);
}

export function clearScriptureMemoryCache() {
  memoryCache.clear();
}