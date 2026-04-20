import { NextResponse } from "next/server";
import type { BibleVersion, ParsedReference, Verse } from "@/types/scripture";

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

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<sup[^>]*>.*?<\/sup>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function splitPassageIntoVerses(
  html: string,
  parsed: ParsedReference,
): Verse[] {
  const plain = stripHtml(html);

  const normalized = plain
    .replace(/(^|\s)(\d+)\s+/g, (_match, lead, verse) => `${lead}\n${verse} `)
    .replace(/\n{2,}/g, "\n")
    .trim();

  const matches = normalized.matchAll(
    /(?:^|\n)(\d+)\s+([\s\S]*?)(?=(?:\n\d+\s)|$)/g,
  );

  const verses = Array.from(matches)
    .map((match) => {
      const verseNumber = Number.parseInt(match[1], 10);
      const text = match[2].replace(/\s+/g, " ").trim();

      if (!Number.isInteger(verseNumber) || !text) return null;

      return {
        chapter: parsed.chapter,
        verse: verseNumber,
        text,
      } satisfies Verse;
    })
    .filter((item): item is Verse => item !== null)
    .sort((a, b) => a.verse - b.verse);

  if (verses.length > 0) {
    return verses.filter((verse) => {
      if (parsed.startVerse && verse.verse < parsed.startVerse) return false;
      if (parsed.endVerse && verse.verse > parsed.endVerse) return false;
      return true;
    });
  }

  const fallbackText = plain.replace(/^\d+\s+/, "").trim();

  if (
    fallbackText &&
    parsed.startVerse &&
    (!parsed.endVerse || parsed.startVerse === parsed.endVerse)
  ) {
    return [
      {
        chapter: parsed.chapter,
        verse: parsed.startVerse,
        text: fallbackText,
      },
    ];
  }

  return [];
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

    const searchUrl = new URL(`${API_BIBLE_BASE_URL}/bibles/${bibleId}/search`);
    searchUrl.searchParams.set("query", reference);

    const searchData = (await apiBibleGet(
      searchUrl,
      apiKey,
    )) as ApiBibleSearchResponse;

    const passage = searchData.data?.passages?.[0];

    if (!passage?.content) {
      return NextResponse.json(
        { ok: false, error: `That passage was not found in ${version}.` },
        { status: 404 },
      );
    }

    const verses = splitPassageIntoVerses(passage.content, parsed);

    if (!verses.length) {
      return NextResponse.json(
        {
          ok: false,
          error: `That passage was not found in ${version}.`,
          details: `Passage search returned content but no verses could be parsed for ${reference}.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, verses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown API.Bible error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}