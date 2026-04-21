import { NextResponse } from "next/server";
import type { BibleVersion, ParsedReference, Verse } from "@/types/scripture";
import {
  getCachedVersesForReference,
  writeChapterCache,
} from "@/lib/scriptureCache";

export const runtime = "nodejs";

type Body = {
  version?: BibleVersion;
  reference?: string;
  parsed?: ParsedReference;
};

type ApiBibleVersion = "KJV" | "MSG" | "NIV" | "AMP";

type ApiBibleSearchPassage = {
  id?: string;
  reference?: string;
  content?: string;
  chapterIds?: string[];
};

type ApiBibleSearchResponse = {
  data?: {
    passages?: ApiBibleSearchPassage[];
  };
};

const API_BIBLE_BASE_URL = "https://rest.api.bible/v1";

const API_BIBLE_ID_BY_VERSION: Record<ApiBibleVersion, string | undefined> = {
  KJV: process.env.API_BIBLE_KJV_ID,
  MSG: process.env.API_BIBLE_MSG_ID,
  NIV: process.env.API_BIBLE_NIV_ID,
  AMP: process.env.API_BIBLE_AMP_ID,
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code) => {
      const value = Number.parseInt(code, 10);
      return Number.isFinite(value) ? String.fromCharCode(value) : "";
    });
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h\d>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n")
      .replace(/<\/?span[^>]*>/gi, "")
      .replace(/<\/?sup[^>]*>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim(),
  );
}

function normalizeBookName(input: string) {
  return input.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function parsePassageReference(reference: string) {
  const cleaned = reference.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);

  if (!match) return null;

  return {
    book: normalizeBookName(match[1]),
    chapter: Number.parseInt(match[2], 10),
    startVerse: match[3] ? Number.parseInt(match[3], 10) : undefined,
    endVerse: match[4] ? Number.parseInt(match[4], 10) : undefined,
  };
}

function normalizePassageForVerseParsing(html: string): string {
  const withVerseBreakHints = html
    .replace(/<sup[^>]*>\s*(\d+)\s*<\/sup>/gi, "\n$1 ")
    .replace(/<span[^>]*>\s*(\d+)\s*<\/span>/gi, "\n$1 ")
    .replace(
      /(^|>|\s)(\d{1,3})(?=\s+[A-Z“"'(\[])/g,
      (_match, lead, verse) => `${lead}\n${verse}`,
    );

  return stripHtml(withVerseBreakHints)
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function splitPassageIntoVerses(html: string, chapter: number): Verse[] {
  const normalized = normalizePassageForVerseParsing(html);

  const matches = normalized.matchAll(
    /(?:^|\n)(\d{1,3})\s+([\s\S]*?)(?=(?:\n\d{1,3}\s)|$)/g,
  );

  const verses = Array.from(matches)
    .map((match) => {
      const verseNumber = Number.parseInt(match[1], 10);
      const text = match[2].replace(/\s+/g, " ").trim();

      if (!Number.isInteger(verseNumber) || !text) return null;

      return {
        chapter,
        verse: verseNumber,
        text,
      } satisfies Verse;
    })
    .filter((item): item is Verse => item !== null)
    .sort((a, b) => a.verse - b.verse);

  const deduped = new Map<number, Verse>();
  for (const verse of verses) {
    if (!deduped.has(verse.verse)) {
      deduped.set(verse.verse, verse);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.verse - b.verse);
}

function sliceVersesForReference(
  verses: Verse[],
  parsed: ParsedReference,
): Verse[] {
  if (parsed.startVerse === undefined) {
    return [...verses].sort((a, b) => a.verse - b.verse);
  }

  const upper = parsed.endVerse ?? parsed.startVerse;

  return verses
    .filter(
      (verse) =>
        verse.verse >= parsed.startVerse! && verse.verse <= upper,
    )
    .sort((a, b) => a.verse - b.verse);
}

async function apiBibleGet(url: URL, apiKey: string) {
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "api-key": String(apiKey).trim(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(
      `API.Bible request failed with status ${response.status}: ${raw.slice(0, 300)}`,
    );
  }

  return response.json();
}

function makeSingleVerseFallback(
  html: string,
  parsed: ParsedReference,
): Verse[] | null {
  if (
    parsed.startVerse === undefined ||
    (parsed.endVerse !== undefined && parsed.startVerse !== parsed.endVerse)
  ) {
    return null;
  }

  const text = stripHtml(html)
    .replace(/^\d{1,3}\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;

  return [
    {
      chapter: parsed.chapter,
      verse: parsed.startVerse,
      text,
    },
  ];
}

function getSearchQuery(reference: string, parsed: ParsedReference) {
  if (parsed.startVerse !== undefined) {
    return reference.trim();
  }

  return `${parsed.book} ${parsed.chapter}`;
}

function isWholeChapterRequest(parsed: ParsedReference) {
  return parsed.startVerse === undefined;
}

function scorePassageMatch(
  passage: ApiBibleSearchPassage,
  parsed: ParsedReference,
): number {
  if (!passage.reference) return -1;

  const parsedRef = parsePassageReference(passage.reference);
  if (!parsedRef) return -1;

  if (parsedRef.book !== normalizeBookName(parsed.book)) return -1;
  if (parsedRef.chapter !== parsed.chapter) return -1;

  let score = 10;

  if (parsed.startVerse === undefined) {
    if (parsedRef.startVerse === undefined) {
      score += 100;
    } else {
      score -= 10;
    }
    return score;
  }

  if (parsedRef.startVerse === undefined) {
    score += 20;
  } else if (parsedRef.startVerse === parsed.startVerse) {
    score += 100;
  } else {
    const distance = Math.abs(parsedRef.startVerse - parsed.startVerse);
    score += Math.max(0, 40 - distance);
  }

  if (parsed.endVerse !== undefined) {
    if (parsedRef.endVerse === parsed.endVerse) {
      score += 50;
    } else if (
      parsedRef.startVerse !== undefined &&
      parsedRef.endVerse !== undefined &&
      parsedRef.startVerse <= parsed.startVerse &&
      parsedRef.endVerse >= parsed.endVerse
    ) {
      score += 30;
    }
  }

  return score;
}

function findBestPassage(
  passages: ApiBibleSearchPassage[] | undefined,
  parsed: ParsedReference,
) {
  if (!passages?.length) return null;

  const ranked = passages
    .map((passage) => ({
      passage,
      score: scorePassageMatch(passage, parsed),
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.passage ?? passages[0] ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const version = body.version;
    const reference = body.reference;
    const parsed = body.parsed;

    if (!version || !reference || !parsed) {
      return NextResponse.json(
        { ok: false, error: "Missing version, reference or parsed reference." },
        { status: 400 },
      );
    }

    if (
      version !== "KJV" &&
      version !== "MSG" &&
      version !== "NIV" &&
      version !== "AMP"
    ) {
      return NextResponse.json(
        { ok: false, error: `Unsupported API.Bible version: ${version}` },
        { status: 400 },
      );
    }

    const apiKey = process.env.API_BIBLE_KEY;
    const bibleId = API_BIBLE_ID_BY_VERSION[version];

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "API_BIBLE_KEY is missing." },
        { status: 500 },
      );
    }

    if (!bibleId) {
      return NextResponse.json(
        { ok: false, error: `Bible ID is missing for ${version}.` },
        { status: 500 },
      );
    }

    const cachedVerses = await getCachedVersesForReference(
      version,
      parsed.book,
      parsed.chapter,
      parsed.startVerse,
      parsed.endVerse,
    );

    if (cachedVerses?.length) {
      return NextResponse.json({
        ok: true,
        verses: cachedVerses,
        cached: true,
      });
    }

    const searchQuery = getSearchQuery(reference, parsed);

    const searchUrl = new URL(`${API_BIBLE_BASE_URL}/bibles/${bibleId}/search`);
    searchUrl.searchParams.set("query", searchQuery);

    const searchData = (await apiBibleGet(
      searchUrl,
      apiKey,
    )) as ApiBibleSearchResponse;

    const passage = findBestPassage(searchData.data?.passages, parsed);

    if (!passage?.content) {
      return NextResponse.json(
        { ok: false, error: `That passage was not found in ${version}.` },
        { status: 404 },
      );
    }

    const chapterVerses = splitPassageIntoVerses(passage.content, parsed.chapter);

    if (!chapterVerses.length) {
      const fallbackVerses = makeSingleVerseFallback(passage.content, parsed);

      if (fallbackVerses?.length) {
        return NextResponse.json({
          ok: true,
          verses: fallbackVerses,
          cached: false,
          fallback: true,
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error: `That passage was not found in ${version}.`,
          details: `Passage content returned but verse parsing failed for ${searchQuery}.`,
        },
        { status: 404 },
      );
    }

    if (isWholeChapterRequest(parsed)) {
      await writeChapterCache({
        version,
        book: parsed.book,
        chapter: parsed.chapter,
        verses: chapterVerses,
        fetchedAt: new Date().toISOString(),
        source: "api-bible",
      });
    }

    const verses = sliceVersesForReference(chapterVerses, parsed);

    if (!verses.length) {
      const fallbackVerses = makeSingleVerseFallback(passage.content, parsed);

      if (fallbackVerses?.length) {
        return NextResponse.json({
          ok: true,
          verses: fallbackVerses,
          cached: false,
          fallback: true,
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error: `That passage was not found in ${version}.`,
          details: `No verses matched ${reference}.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, verses, cached: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown API.Bible error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}