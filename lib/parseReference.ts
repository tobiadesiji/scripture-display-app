import type { ParsedReference } from "@/types/scripture";
import { findBookByInput } from "./bookMeta";

export function parseReference(input: string): ParsedReference | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/i);
  if (!match) return null;

  const [, rawBook, chapterStr, startVerseStr, endVerseStr] = match;
  const book = findBookByInput(rawBook);
  if (!book) return null;

  const chapter = Number(chapterStr);
  if (!Number.isInteger(chapter) || chapter < 1) return null;

  const startVerse = startVerseStr ? Number(startVerseStr) : undefined;
  const endVerse = endVerseStr ? Number(endVerseStr) : undefined;

  if (startVerse !== undefined && (!Number.isInteger(startVerse) || startVerse < 1)) return null;
  if (endVerse !== undefined && (!Number.isInteger(endVerse) || endVerse < (startVerse ?? 1))) return null;

  return {
    book: book.name,
    slug: book.slug,
    chapter,
    startVerse,
    endVerse: endVerse ?? startVerse
  };
}
