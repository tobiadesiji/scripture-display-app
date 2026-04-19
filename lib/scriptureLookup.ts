import type { ParsedReference, Verse } from "@/types/scripture";
import { buildReferenceLabel, getPassageFromBible } from "@/lib/getPassage";

export type ScriptureLookupResult =
  | {
      ok: true;
      verses: Verse[];
      reference: string;
    }
  | {
      ok: false;
      code: "CHAPTER_NOT_FOUND" | "VERSE_NOT_FOUND";
      message: string;
    };

export default function scriptureLookup(
  verses: Verse[],
  parsed: ParsedReference,
): ScriptureLookupResult {
  const passage = getPassageFromBible(verses, parsed);

  if (passage.length === 0) {
    const chapterExists = verses.some(
      (verse) =>
        (verse.book ?? "").toLowerCase() === parsed.book.toLowerCase() &&
        verse.chapter === parsed.chapter,
    );

    if (!chapterExists) {
      return {
        ok: false,
        code: "CHAPTER_NOT_FOUND",
        message: `${parsed.book} ${parsed.chapter} could not be found.`,
      };
    }

    return {
      ok: false,
      code: "VERSE_NOT_FOUND",
      message:
        parsed.startVerse != null
          ? `${parsed.book} ${parsed.chapter}:${parsed.startVerse} could not be found.`
          : `${parsed.book} ${parsed.chapter} could not be found.`,
      };
  }

  return {
    ok: true,
    verses: passage,
    reference: buildReferenceLabel(parsed, passage),
  };
}