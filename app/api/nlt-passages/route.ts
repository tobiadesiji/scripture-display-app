import { NextRequest, NextResponse } from "next/server";
import {
  getCachedVersesForReference,
  writeChapterCache,
} from "@/lib/scriptureCache";
import { cleanNltHtmlToVerses } from "@/lib/cleanNltHtml";
import type { Verse } from "@/types/scripture";

export const runtime = "nodejs";

const NLT_API_URL = "https://api.nlt.to/api/passages";

function parseChapterReference(reference: string) {
  const trimmed = reference.trim();
  const match = trimmed.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);

  if (!match) {
    return null;
  }

  const book = match[1].trim();
  const chapter = Number.parseInt(match[2], 10);
  const startVerse = match[3] ? Number.parseInt(match[3], 10) : undefined;
  const endVerse = match[4] ? Number.parseInt(match[4], 10) : startVerse;

  if (!book || !Number.isInteger(chapter)) {
    return null;
  }

  return {
    book,
    chapter,
    startVerse,
    endVerse,
  };
}

function buildChapterReference(book: string, chapter: number) {
  return `${book} ${chapter}`;
}

function sliceVerses(
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

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("ref");
  const version = request.nextUrl.searchParams.get("version") || "NLT";
  const apiKey = process.env.NLT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing NLT_API_KEY in environment." },
      { status: 500 },
    );
  }

  if (!reference) {
    return NextResponse.json(
      { error: "Missing ref query parameter." },
      { status: 400 },
    );
  }

  if (version !== "NLT") {
    return NextResponse.json(
      { error: `Unsupported NLT version request: ${version}` },
      { status: 400 },
    );
  }

  const parsed = parseChapterReference(reference);

  if (!parsed) {
    return NextResponse.json(
      { error: `Invalid reference format: ${reference}` },
      { status: 400 },
    );
  }

  try {
    const cachedVerses = await getCachedVersesForReference(
      "NLT",
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
        reference,
        chapterReference: buildChapterReference(parsed.book, parsed.chapter),
      });
    }

    const chapterReference = buildChapterReference(parsed.book, parsed.chapter);

    const url = new URL(NLT_API_URL);
    url.searchParams.set("ref", chapterReference);
    url.searchParams.set("version", version);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `NLT API request failed with status ${response.status}`,
          details: text,
        },
        { status: response.status },
      );
    }

    const chapterVerses = cleanNltHtmlToVerses(text, parsed.chapter).sort(
      (a, b) => a.verse - b.verse,
    );

    if (!chapterVerses.length) {
      return NextResponse.json(
        {
          error: "NLT API returned no renderable verses.",
          details: text.slice(0, 500),
        },
        { status: 404 },
      );
    }

    await writeChapterCache({
      version: "NLT",
      book: parsed.book,
      chapter: parsed.chapter,
      verses: chapterVerses,
      fetchedAt: new Date().toISOString(),
      source: "nlt",
    });

    const verses = sliceVerses(
      chapterVerses,
      parsed.startVerse,
      parsed.endVerse,
    );

    if (!verses.length) {
      return NextResponse.json(
        {
          error: "That passage was not found in NLT.",
          details: `No verses matched ${reference}.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      verses,
      raw: text,
      cached: false,
      reference,
      chapterReference,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to contact NLT API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}