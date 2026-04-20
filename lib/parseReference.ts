import { BOOKS } from "@/lib/bookMeta";
import type { ParsedReference } from "@/types/scripture";

export type ParseReferenceErrorCode =
  | "EMPTY_INPUT"
  | "BOOK_NOT_FOUND"
  | "MISSING_CHAPTER"
  | "INVALID_REFERENCE_FORMAT"
  | "INVALID_CHAPTER_OR_VERSE";

export type ParseReferenceResult =
  | { ok: true; value: ParsedReference }
  | {
      ok: false;
      error: {
        code: ParseReferenceErrorCode;
        message: string;
      };
    };

type AliasEntry = {
  alias: string;
  book: string;
  slug: string;
};

const EXTRA_ALIASES: Record<string, string[]> = {
  Genesis: ["gen", "ge", "gn"],
  Exodus: ["exo"],
  Leviticus: ["le", "lv"],
  Numbers: ["nm", "nb"],
  Deuteronomy: ["dt"],
  Joshua: ["jos"],
  Judges: ["jdg", "jg"],
  Ruth: ["rth", "ru"],
  "1 Samuel": ["1sam", "first samuel", "first sam", "i samuel", "i sam"],
  "2 Samuel": ["2sam", "second samuel", "second sam", "ii samuel", "ii sam"],
  "1 Kings": ["1 king", "1kgs", "1 kin", "first kings", "first king", "i kings", "i king"],
  "2 Kings": ["2 king", "2kgs", "2 kin", "second kings", "second king", "ii kings", "ii king"],
  "1 Chronicles": ["1 chr", "1chr", "first chronicles", "first chron", "i chronicles", "i chron"],
  "2 Chronicles": ["2 chr", "2chr", "second chronicles", "second chron", "ii chronicles", "ii chron"],
  Ezra: ["ezr"],
  Nehemiah: ["ne"],
  Esther: ["est"],
  Psalm: ["ps", "psa", "psalm", "psalms", "psm"],
  Proverbs: ["proverb", "pro", "prv"],
  Ecclesiastes: ["eccles", "ecc"],
  "Song of Solomon": ["song of songs", "song", "songs", "sos", "canticles"],
  Isaiah: ["is"],
  Jeremiah: ["je", "jr"],
  Ezekiel: ["eze", "ezk"],
  Daniel: ["dn"],
  Hosea: ["ho"],
  Joel: ["jl"],
  Obadiah: ["ob"],
  Jonah: ["jon"],
  Micah: ["mic", "mc"],
  Nahum: ["nah", "na"],
  Habakkuk: ["hb"],
  Zephaniah: ["zep", "zp"],
  Haggai: ["hg"],
  Zechariah: ["zec", "zc"],
  Matthew: ["mat", "mt"],
  Mark: ["mrk", "mk", "mr"],
  Luke: ["luk", "lk"],
  John: ["jhn", "jn"],
  Acts: ["act", "ac"],
  Romans: ["ro", "rm"],
  "1 Corinthians": ["1 corinthian", "1cor", "first corinthians", "first cor", "i corinthians", "i cor"],
  "2 Corinthians": ["2 corinthian", "2cor", "second corinthians", "second cor", "ii corinthians", "ii cor"],
  Galatians: ["ga"],
  Ephesians: ["ep"],
  Philippians: ["php"],
  Colossians: ["co"],
  "1 Thessalonians": ["1 thes", "1thess", "first thessalonians", "first thess", "i thessalonians", "i thess"],
  "2 Thessalonians": ["2 thes", "2thess", "second thessalonians", "second thess", "ii thessalonians", "ii thess"],
  "1 Timothy": ["1tim", "first timothy", "first tim", "i timothy", "i tim"],
  "2 Timothy": ["2tim", "second timothy", "second tim", "ii timothy", "ii tim"],
  Titus: ["tit", "ti"],
  Philemon: ["philem", "phm", "pm"],
  James: ["jam", "jm"],
  "1 Peter": ["1pet", "first peter", "first pet", "i peter", "i pet"],
  "2 Peter": ["2pet", "second peter", "second pet", "ii peter", "ii pet"],
  "1 John": ["1 jn", "1jn", "first john", "first jn", "i john", "i jn"],
  "2 John": ["2 jn", "2jn", "second john", "second jn", "ii john", "ii jn"],
  "3 John": ["3 jn", "3jn", "third john", "third jn", "iii john", "iii jn"],
  Jude: ["jud"],
  Revelation: ["re", "the revelation"],
};

const ALIASES: AliasEntry[] = BOOKS.flatMap((book) => {
  const aliases = new Set<string>([
    ...book.aliases,
    ...(EXTRA_ALIASES[book.name] ?? []),
  ]);

  return [...aliases].map((alias) => ({
    alias: normalizeText(alias),
    book: book.name,
    slug: book.slug,
  }));
}).sort((a, b) => b.alias.length - a.alias.length);

const MIN_FUZZY_ALIAS_LENGTH = 4;
const MAX_FUZZY_DISTANCE_SHORT = 1;
const MAX_FUZZY_DISTANCE_LONG = 2;

export default function parseReference(rawInput: string): ParsedReference | null {
  const result = parseReferenceDetailed(rawInput);
  return result.ok ? result.value : null;
}

export function parseReferenceDetailed(rawInput: string): ParseReferenceResult {
  const normalizedInput = normalizeReferenceInput(rawInput);

  if (!normalizedInput) {
    return {
      ok: false,
      error: {
        code: "EMPTY_INPUT",
        message: "Please enter a Bible reference.",
      },
    };
  }

  const bookMatch = findBookMatch(normalizedInput);

  if (!bookMatch) {
    return {
      ok: false,
      error: {
        code: "BOOK_NOT_FOUND",
        message: "Could not identify the Bible book from your search.",
      },
    };
  }

  const parsedTail = parseTail(bookMatch.remainder);

  if (!parsedTail.ok) {
    return {
      ok: false,
      error: parsedTail.error,
    };
  }

  return {
    ok: true,
    value: {
      book: bookMatch.book,
      slug: bookMatch.slug,
      chapter: parsedTail.value.chapter,
      startVerse: parsedTail.value.startVerse,
      endVerse: parsedTail.value.endVerse,
    },
  };
}

function findBookMatch(
  input: string,
): { book: string; slug: string; remainder: string } | null {
  const exact = matchBookAlias(input);
  if (exact) {
    return exact;
  }

  const digitIndex = input.search(/\d/);
  const probableBookPart =
    digitIndex === -1 ? input : input.slice(0, digitIndex).trim();

  if (!probableBookPart || probableBookPart.length < MIN_FUZZY_ALIAS_LENGTH) {
    return null;
  }

  const fuzzy = findClosestAlias(probableBookPart);
  if (!fuzzy) {
    return null;
  }

  return {
    book: fuzzy.book,
    slug: fuzzy.slug,
    remainder: input.slice(probableBookPart.length).trim(),
  };
}

function matchBookAlias(
  input: string,
): { book: string; slug: string; remainder: string } | null {
  for (const entry of ALIASES) {
    if (!input.startsWith(entry.alias)) {
      continue;
    }

    const nextChar = input.charAt(entry.alias.length);

    if (!nextChar || nextChar === " " || /\d/.test(nextChar)) {
      return {
        book: entry.book,
        slug: entry.slug,
        remainder: input.slice(entry.alias.length).trim(),
      };
    }
  }

  return null;
}

function parseTail(
  remainder: string,
):
  | {
      ok: true;
      value: {
        chapter: number;
        startVerse?: number;
        endVerse?: number;
      };
    }
  | {
      ok: false;
      error: {
        code: ParseReferenceErrorCode;
        message: string;
      };
    } {
  const tail = normalizeReferenceTail(remainder);

  if (!tail) {
    return {
      ok: false,
      error: {
        code: "MISSING_CHAPTER",
        message: "Please include a chapter number, for example John 3 or John 3:16.",
      },
    };
  }

  const chapterVerseRange = tail.match(/^(\d+):(\d+)-(\d+)$/);
  if (chapterVerseRange) {
    const chapter = toPositiveInt(chapterVerseRange[1]);
    const startVerse = toPositiveInt(chapterVerseRange[2]);
    const endVerse = toPositiveInt(chapterVerseRange[3]);

    if (!chapter || !startVerse || !endVerse || endVerse < startVerse) {
      return invalidReference();
    }

    return {
      ok: true,
      value: { chapter, startVerse, endVerse },
    };
  }

  const chapterVerse = tail.match(/^(\d+):(\d+)$/);
  if (chapterVerse) {
    const chapter = toPositiveInt(chapterVerse[1]);
    const startVerse = toPositiveInt(chapterVerse[2]);

    if (!chapter || !startVerse) {
      return invalidReference();
    }

    return {
      ok: true,
      value: { chapter, startVerse },
    };
  }

  const chapterVerseSpaceRange = tail.match(/^(\d+)\s+(\d+)-(\d+)$/);
  if (chapterVerseSpaceRange) {
    const chapter = toPositiveInt(chapterVerseSpaceRange[1]);
    const startVerse = toPositiveInt(chapterVerseSpaceRange[2]);
    const endVerse = toPositiveInt(chapterVerseSpaceRange[3]);

    if (!chapter || !startVerse || !endVerse || endVerse < startVerse) {
      return invalidReference();
    }

    return {
      ok: true,
      value: { chapter, startVerse, endVerse },
    };
  }

  const chapterVerseSpace = tail.match(/^(\d+)\s+(\d+)$/);
  if (chapterVerseSpace) {
    const chapter = toPositiveInt(chapterVerseSpace[1]);
    const startVerse = toPositiveInt(chapterVerseSpace[2]);

    if (!chapter || !startVerse) {
      return invalidReference();
    }

    return {
      ok: true,
      value: { chapter, startVerse },
    };
  }

  const chapterOnly = tail.match(/^(\d+)$/);
  if (chapterOnly) {
    const chapter = toPositiveInt(chapterOnly[1]);

    if (!chapter) {
      return invalidReference();
    }

    return {
      ok: true,
      value: { chapter },
    };
  }

  return {
    ok: false,
    error: {
      code: "INVALID_REFERENCE_FORMAT",
      message:
        "Reference format not recognised. Try John 3, John 3:16, Gen 1 1, or 1 Cor 13,4.",
    },
  };
}

function invalidReference() {
  return {
    ok: false as const,
    error: {
      code: "INVALID_CHAPTER_OR_VERSE" as const,
      message:
        "Chapter and verse values must be positive numbers and ranges must move forward.",
    },
  };
}

function normalizeReferenceInput(input: string): string {
  return normalizeText(
    input
      .replace(/[，、؛;]/g, ",")
      .replace(/\s*,\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalizeReferenceTail(input: string): string {
  return input
    .replace(/\s*,\s*/g, ":")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\bfirst\b/g, "1")
    .replace(/\bsecond\b/g, "2")
    .replace(/\bthird\b/g, "3")
    .replace(/\biii\b/g, "3")
    .replace(/\bii\b/g, "2")
    .replace(/\bi\b/g, "1")
    .replace(/\s+/g, " ")
    .trim();
}

function toPositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function findClosestAlias(input: string): AliasEntry | null {
  let best: { entry: AliasEntry; distance: number } | null = null;

  for (const entry of ALIASES) {
    if (entry.alias.length < MIN_FUZZY_ALIAS_LENGTH) {
      continue;
    }

    const distance = levenshtein(input, entry.alias);
    const maxDistance =
      entry.alias.length <= 6
        ? MAX_FUZZY_DISTANCE_SHORT
        : MAX_FUZZY_DISTANCE_LONG;

    if (distance > maxDistance) {
      continue;
    }

    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && entry.alias.length > best.entry.alias.length)
    ) {
      best = { entry, distance };
    }
  }

  return best?.entry ?? null;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}