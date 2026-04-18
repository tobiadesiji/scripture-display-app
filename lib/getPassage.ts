import type { ParsedReference, Verse } from "@/types/scripture";

export function getPassageFromBible(verses: Verse[], parsed: ParsedReference): Verse[] {
  const chapterVerses = verses
    .filter(
      (verse) =>
        (verse.book ?? "").toLowerCase() === parsed.book.toLowerCase() &&
        verse.chapter === parsed.chapter
    )
    .sort((a, b) => a.verse - b.verse);

  if (parsed.startVerse === undefined) {
    return chapterVerses;
  }

  const upper = parsed.endVerse ?? parsed.startVerse;

  return chapterVerses.filter(
    (verse) => verse.verse >= parsed.startVerse! && verse.verse <= upper
  );
}

export function buildReferenceLabel(parsed: ParsedReference, verses: Verse[]) {
  if (verses.length === 0) return `${parsed.book} ${parsed.chapter}`;

  if (parsed.startVerse === undefined) {
    return `${parsed.book} ${parsed.chapter}`;
  }

  const first = verses[0].verse;
  const last = verses[verses.length - 1].verse;

  return first === last
    ? `${parsed.book} ${parsed.chapter}:${first}`
    : `${parsed.book} ${parsed.chapter}:${first}-${last}`;
}