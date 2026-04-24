import { NextResponse } from "next/server";
import type { BibleVersion, ParsedReference, Verse } from "@/types/scripture";

export const runtime = "nodejs";

type Body = {
  version?: BibleVersion;
  reference?: string;
  parsed?: ParsedReference;
};

type ProviderName = "youversion" | "api-bible" | "nlt";

type ProviderResult = {
  provider: ProviderName;
  verses: Verse[];
  fallback?: boolean;
};

type ProviderContext = {
  version: BibleVersion;
  reference: string;
  parsed: ParsedReference;
};

type ProviderAdapter = {
  name: ProviderName;
  supports: (version: BibleVersion) => boolean;
  fetch: (ctx: ProviderContext) => Promise<ProviderResult>;
};

type ApiBibleSearchPassage = {
  id?: string;
  reference?: string;
  content?: string;
};

type ApiBibleSearchResponse = {
  data?: {
    passages?: ApiBibleSearchPassage[];
  };
};

type YouVersionChapterVerseItem = {
  id?: string;
  passage_id?: string;
  title?: string;
};

type YouVersionChapterVersesResponse = {
  data?: YouVersionChapterVerseItem[];
};

type YouVersionPassageResponse = {
  id?: string;
  content?: string;
  reference?: string;
};

type YouVersionAnchor = {
  passageId: string;
  startVerse: number;
};

const API_BIBLE_BASE_URL = "https://rest.api.bible/v1";
const YOUVERSION_BASE_URL = "https://api.youversion.com/v1";

const API_BIBLE_ID_BY_VERSION: Partial<Record<BibleVersion, string | undefined>> =
  {
    KJV: process.env.API_BIBLE_KJV_ID,
    MSG: process.env.API_BIBLE_MSG_ID,
    NIV: process.env.API_BIBLE_NIV_ID,
    AMP: process.env.API_BIBLE_AMP_ID,
  };

const YOUVERSION_ID_BY_VERSION: Partial<
  Record<BibleVersion, string | undefined>
> = {
  KJV: process.env.YOUVERSION_KJV_ID,
  NIV: process.env.YOUVERSION_NIV_ID,
  AMP: process.env.YOUVERSION_AMP_ID,
  TPT: process.env.YOUVERSION_TPT_ID,
};

const SLUG_TO_USFM: Record<string, string> = {
  genesis: "GEN",
  exodus: "EXO",
  leviticus: "LEV",
  numbers: "NUM",
  deuteronomy: "DEU",
  joshua: "JOS",
  judges: "JDG",
  ruth: "RUT",
  "1-samuel": "1SA",
  "2-samuel": "2SA",
  "1-kings": "1KI",
  "2-kings": "2KI",
  "1-chronicles": "1CH",
  "2-chronicles": "2CH",
  ezra: "EZR",
  nehemiah: "NEH",
  esther: "EST",
  job: "JOB",
  psalm: "PSA",
  psalms: "PSA",
  proverbs: "PRO",
  ecclesiastes: "ECC",
  "song-of-solomon": "SNG",
  "song-of-songs": "SNG",
  isaiah: "ISA",
  jeremiah: "JER",
  lamentations: "LAM",
  ezekiel: "EZK",
  daniel: "DAN",
  hosea: "HOS",
  joel: "JOL",
  amos: "AMO",
  obadiah: "OBA",
  jonah: "JON",
  micah: "MIC",
  nahum: "NAM",
  habakkuk: "HAB",
  zephaniah: "ZEP",
  haggai: "HAG",
  zechariah: "ZEC",
  malachi: "MAL",
  matthew: "MAT",
  mark: "MRK",
  luke: "LUK",
  john: "JHN",
  acts: "ACT",
  romans: "ROM",
  "1-corinthians": "1CO",
  "2-corinthians": "2CO",
  galatians: "GAL",
  ephesians: "EPH",
  philippians: "PHP",
  colossians: "COL",
  "1-thessalonians": "1TH",
  "2-thessalonians": "2TH",
  "1-timothy": "1TI",
  "2-timothy": "2TI",
  titus: "TIT",
  philemon: "PHM",
  hebrews: "HEB",
  james: "JAS",
  "1-peter": "1PE",
  "2-peter": "2PE",
  "1-john": "1JN",
  "2-john": "2JN",
  "3-john": "3JN",
  jude: "JUD",
  revelation: "REV",
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

function normalizePlainText(input: string): string {
  return decodeHtmlEntities(input).replace(/\s+/g, " ").trim();
}

function normalizeBookName(input: string): string {
  return input.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function parsePassageReference(reference: string): {
  book: string;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
} | null {
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

function cleanVerseDisplayText(text: string): string {
  let cleaned = decodeHtmlEntities(text).trim();

  cleaned = cleaned.replace(
    /^\s*\d{1,3}(?:[a-z])?(?:\s*-\s*\d{1,3}(?:[a-z])?)?(?=\s|["“”'‘’(\[])/i,
    "",
  );

  cleaned = cleaned.replace(/^[\s:.,;!?'"“”‘’()[\]-]+/, "");
  return cleaned.replace(/\s+/g, " ").trim();
}

function parseMsgLeadingLabel(text: string): string | null {
  const cleaned = decodeHtmlEntities(text).trim();
  const match = cleaned.match(
    /^\s*(\d{1,3}(?:[a-z])?(?:\s*-\s*\d{1,3}(?:[a-z])?)?)(?=\s|["“”'‘’(\[])/i,
  );
  return match ? match[1].replace(/\s+/g, "") : null;
}

function parseMsgLabelParts(
  label: string,
): { startVerse: number; endVerse?: number; label: string } | null {
  const match = label.match(
    /^\s*(\d{1,3})(?:[a-z])?(?:\s*-\s*(\d{1,3})(?:[a-z])?)?\s*$/i,
  );

  if (!match) return null;

  const startVerse = Number.parseInt(match[1], 10);
  const endVerse = match[2] ? Number.parseInt(match[2], 10) : undefined;

  if (!Number.isInteger(startVerse)) return null;

  return {
    startVerse,
    endVerse: Number.isInteger(endVerse) ? endVerse : undefined,
    label: label.replace(/\s+/g, ""),
  };
}

function normalizePassageForVerseParsing(html: string): string {
  const withVerseBreakHints = html
    .replace(/<sup[^>]*>\s*(\d+)\s*<\/sup>/gi, "\n$1 ")
    .replace(/<span[^>]*>\s*(\d+)\s*<\/span>/gi, "\n$1 ");

  return stripHtml(withVerseBreakHints).replace(/\n{2,}/g, "\n").trim();
}

function splitPassageIntoVerses(html: string, chapter: number): Verse[] {
  const normalized = normalizePassageForVerseParsing(html);
  const matches = normalized.matchAll(
    /(?:^|\n)(\d{1,3})\s+([\s\S]*?)(?=(?:\n\d{1,3}\s)|$)/g,
  );

  const verses: Verse[] = [];

  for (const match of matches) {
    const verseNumber = Number.parseInt(match[1], 10);
    const text = cleanVerseDisplayText(match[2]);

    if (Number.isInteger(verseNumber) && text) {
      verses.push({
        chapter,
        verse: verseNumber,
        label: String(verseNumber),
        text,
      });
    }
  }

  const deduped = new Map<number, Verse>();
  for (const verse of verses.sort((a, b) => a.verse - b.verse)) {
    if (!deduped.has(verse.verse)) {
      deduped.set(verse.verse, verse);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.verse - b.verse);
}

function splitMsgPassageIntoBlocks(html: string, chapter: number): Verse[] {
  const normalized = stripHtml(html).replace(/\n{2,}/g, "\n").trim();
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: Verse[] = [];
  let currentLabel: string | null = null;
  let currentStartVerse: number | null = null;
  let currentEndVerse: number | undefined;
  let currentParts: string[] = [];

  const flush = () => {
    if (currentStartVerse === null) return;

    const raw = `${currentLabel ?? String(currentStartVerse)} ${currentParts.join(" ").trim()}`;
    const text = cleanVerseDisplayText(raw);

    if (!text) return;

    blocks.push({
      chapter,
      verse: currentStartVerse,
      endVerse: currentEndVerse,
      label: currentLabel ?? String(currentStartVerse),
      text,
    });
  };

  for (const line of lines) {
    const maybeLabel = parseMsgLeadingLabel(line);
    const parts = maybeLabel ? parseMsgLabelParts(maybeLabel) : null;

    if (parts) {
      flush();
      currentLabel = parts.label;
      currentStartVerse = parts.startVerse;
      currentEndVerse = parts.endVerse;
      currentParts = [line];
    } else if (currentStartVerse !== null) {
      currentParts.push(line);
    }
  }

  flush();

  if (blocks.length > 0) {
    const deduped = new Map<string, Verse>();
    for (const block of blocks) {
      const key = `${block.chapter}-${block.verse}-${block.label ?? ""}`;
      if (!deduped.has(key)) {
        deduped.set(key, block);
      }
    }
    return Array.from(deduped.values()).sort((a, b) => a.verse - b.verse);
  }

  return [];
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
    .filter((verse) => verse.verse >= parsed.startVerse! && verse.verse <= upper)
    .sort((a, b) => a.verse - b.verse);
}

function sliceMsgBlocksForReference(
  verses: Verse[],
  parsed: ParsedReference,
): Verse[] {
  if (parsed.startVerse === undefined) {
    return [...verses].sort((a, b) => a.verse - b.verse);
  }

  const requestStart = parsed.startVerse;
  const requestEnd = parsed.endVerse ?? parsed.startVerse;

  const overlapping = verses.filter((verse, index) => {
    const next = verses[index + 1];
    const inferredEnd = next ? next.verse - 1 : Number.POSITIVE_INFINITY;
    const blockEnd = verse.endVerse ?? inferredEnd;

    return verse.verse <= requestEnd && blockEnd >= requestStart;
  });

  if (overlapping.length > 0) {
    return overlapping.sort((a, b) => a.verse - b.verse);
  }

  const fallback = [...verses]
    .filter((verse) => verse.verse <= requestStart)
    .sort((a, b) => b.verse - a.verse)[0];

  return fallback ? [fallback] : [];
}

function getSearchQuery(reference: string, parsed: ParsedReference): string {
  if (parsed.startVerse !== undefined) {
    return reference.trim();
  }

  return `${parsed.book} ${parsed.chapter}`;
}

function isWholeChapterRequest(parsed: ParsedReference): boolean {
  return parsed.startVerse === undefined;
}

function getYouVersionUsfm(slug: string, book: string): string | null {
  const fromSlug = SLUG_TO_USFM[slug.toLowerCase().trim()];
  if (fromSlug) return fromSlug;

  const normalizedBook = book.toLowerCase().replace(/\s+/g, "-").trim();
  return SLUG_TO_USFM[normalizedBook] ?? null;
}

function parseVerseNumberFromPassageId(passageId: string): number | null {
  const match = passageId.match(/^[A-Z0-9]+\.\d+\.(\d+)$/i);
  if (!match) return null;

  const verseNumber = Number.parseInt(match[1], 10);
  return Number.isInteger(verseNumber) ? verseNumber : null;
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

  const text = cleanVerseDisplayText(stripHtml(html));

  if (!text) return null;

  return [
    {
      chapter: parsed.chapter,
      verse: parsed.startVerse,
      label: String(parsed.startVerse),
      text,
    },
  ];
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
): ApiBibleSearchPassage | null {
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

function findAllChapterPassages(
  passages: ApiBibleSearchPassage[] | undefined,
  parsed: ParsedReference,
): ApiBibleSearchPassage[] {
  if (!passages?.length) return [];

  return passages.filter((passage) => {
    if (!passage.reference || !passage.content) return false;

    const parsedRef = parsePassageReference(passage.reference);
    if (!parsedRef) return false;

    return (
      parsedRef.book === normalizeBookName(parsed.book) &&
      parsedRef.chapter === parsed.chapter
    );
  });
}

async function apiBibleGet(url: URL, apiKey: string): Promise<unknown> {
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

async function youVersionGetJson(
  path: string,
  appKey: string,
): Promise<unknown> {
  const response = await fetch(`${YOUVERSION_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "X-YVP-App-Key": String(appKey).trim(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(
      `YouVersion request failed with status ${response.status}: ${raw.slice(0, 300)}`,
    );
  }

  return response.json();
}

const nltAdapter: ProviderAdapter = {
  name: "nlt",

  supports(version) {
    return version === "NLT";
  },

  async fetch({ reference }) {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";

    const url = new URL("/api/nlt-passages", baseUrl);
    url.searchParams.set("ref", reference);
    url.searchParams.set("version", "NLT");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = (await response.json()) as {
      ok?: boolean;
      verses?: Verse[];
      error?: string;
      details?: string;
    };

    if (!response.ok || !data.ok || !data.verses?.length) {
      throw new Error(
        data.error || data.details || "That passage was not found in NLT.",
      );
    }

    return {
      provider: "nlt",
      verses: data.verses,
    };
  },
};

const youVersionAdapter: ProviderAdapter = {
  name: "youversion",

  supports(version) {
    return Boolean(
      process.env.YOUVERSION_APP_KEY && YOUVERSION_ID_BY_VERSION[version],
    );
  },

  async fetch({ version, reference, parsed }) {
    const appKey = process.env.YOUVERSION_APP_KEY;
    const bibleId = YOUVERSION_ID_BY_VERSION[version];

    if (!appKey) {
      throw new Error("Missing YOUVERSION_APP_KEY");
    }

    if (!bibleId) {
      throw new Error(`YouVersion Bible ID is missing for ${version}`);
    }

    const usfm = getYouVersionUsfm(parsed.slug, parsed.book);
    if (!usfm) {
      throw new Error(`Unsupported YouVersion book mapping for ${parsed.book}`);
    }

    const chapterData = (await youVersionGetJson(
      `/bibles/${encodeURIComponent(String(bibleId))}/books/${encodeURIComponent(
        usfm,
      )}/chapters/${parsed.chapter}/verses`,
      appKey,
    )) as YouVersionChapterVersesResponse;

    const verseItems = Array.isArray(chapterData.data) ? chapterData.data : [];

    if (!verseItems.length) {
      throw new Error(`That passage was not found in ${version} via YouVersion.`);
    }

    const anchors: YouVersionAnchor[] = verseItems
      .map((item) => {
        const passageId = String(item.passage_id ?? item.id ?? "");
        const startVerse = parseVerseNumberFromPassageId(passageId);

        if (!passageId || startVerse === null) {
          return null;
        }

        return { passageId, startVerse };
      })
      .filter((item): item is YouVersionAnchor => item !== null)
      .sort((a, b) => a.startVerse - b.startVerse);

    const selectedAnchors =
      parsed.startVerse === undefined
        ? anchors
        : anchors.filter((anchor) => {
            const requestEnd = parsed.endVerse ?? parsed.startVerse!;
            return (
              anchor.startVerse >= parsed.startVerse! &&
              anchor.startVerse <= requestEnd
            );
          });

    if (!selectedAnchors.length) {
      throw new Error(
        `No verses matched ${reference} in ${version} via YouVersion.`,
      );
    }

    const verseResults = await Promise.all(
      selectedAnchors.map(async (anchor) => {
        const passageData = (await youVersionGetJson(
          `/bibles/${encodeURIComponent(
            String(bibleId),
          )}/passages/${encodeURIComponent(anchor.passageId)}`,
          appKey,
        )) as YouVersionPassageResponse;

        const text = normalizePlainText(String(passageData.content ?? ""));

        if (!text) {
          return null;
        }

        return {
          chapter: parsed.chapter,
          verse: anchor.startVerse,
          label: String(anchor.startVerse),
          text: cleanVerseDisplayText(text),
        } satisfies Verse;
      }),
    );

    const verses: Verse[] = verseResults
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.verse - b.verse);

    if (!verses.length) {
      throw new Error(`No verse text was returned for ${reference} in ${version}.`);
    }

    return {
      provider: "youversion",
      verses,
    };
  },
};

const apiBibleAdapter: ProviderAdapter = {
  name: "api-bible",

  supports(version) {
    return Boolean(process.env.API_BIBLE_KEY && API_BIBLE_ID_BY_VERSION[version]);
  },

  async fetch({ version, reference, parsed }) {
    const apiKey = process.env.API_BIBLE_KEY;
    const bibleId = API_BIBLE_ID_BY_VERSION[version];

    if (!apiKey) {
      throw new Error("API_BIBLE_KEY is missing.");
    }

    if (!bibleId) {
      throw new Error(`Bible ID is missing for ${version}.`);
    }

    const searchQuery = getSearchQuery(reference, parsed);
    const searchUrl = new URL(`${API_BIBLE_BASE_URL}/bibles/${bibleId}/search`);
    searchUrl.searchParams.set("query", searchQuery);

    const searchData = (await apiBibleGet(searchUrl, apiKey)) as ApiBibleSearchResponse;

    let chapterVerses: Verse[] = [];

    if (version === "MSG" && isWholeChapterRequest(parsed)) {
      const chapterPassages = findAllChapterPassages(searchData.data?.passages, parsed);

      if (!chapterPassages.length) {
        throw new Error(`That passage was not found in ${version}.`);
      }

      const merged: Verse[] = [];

      for (const chapterPassage of chapterPassages) {
        const parsedBlocks = splitMsgPassageIntoBlocks(
          String(chapterPassage.content ?? ""),
          parsed.chapter,
        );
        merged.push(...parsedBlocks);
      }

      const deduped = new Map<string, Verse>();
      for (const verse of merged.sort((a, b) => a.verse - b.verse)) {
        const key = `${verse.chapter}-${verse.verse}-${verse.label ?? ""}`;
        if (!deduped.has(key)) {
          deduped.set(key, verse);
        }
      }

      chapterVerses = Array.from(deduped.values()).sort((a, b) => a.verse - b.verse);
    } else {
      const passage = findBestPassage(searchData.data?.passages, parsed);

      if (!passage?.content) {
        throw new Error(`That passage was not found in ${version}.`);
      }

      chapterVerses =
        version === "MSG"
          ? splitMsgPassageIntoBlocks(passage.content, parsed.chapter)
          : splitPassageIntoVerses(passage.content, parsed.chapter);
    }

    if (!chapterVerses.length) {
      const fallbackPassage = findBestPassage(searchData.data?.passages, parsed);

      if (fallbackPassage?.content) {
        const fallbackVerses = makeSingleVerseFallback(fallbackPassage.content, parsed);
        if (fallbackVerses?.length) {
          return {
            provider: "api-bible",
            verses: fallbackVerses,
            fallback: true,
          };
        }
      }

      throw new Error(
        `Passage content returned but verse parsing failed for ${searchQuery}.`,
      );
    }

    const verses =
      version === "MSG"
        ? sliceMsgBlocksForReference(chapterVerses, parsed)
        : sliceVersesForReference(chapterVerses, parsed);

    if (!verses.length) {
      const fallbackPassage = findBestPassage(searchData.data?.passages, parsed);

      if (fallbackPassage?.content) {
        const fallbackVerses = makeSingleVerseFallback(fallbackPassage.content, parsed);
        if (fallbackVerses?.length) {
          return {
            provider: "api-bible",
            verses: fallbackVerses,
            fallback: true,
          };
        }
      }

      throw new Error(`No verses matched ${reference}.`);
    }

    return {
      provider: "api-bible",
      verses,
    };
  },
};

function getProviderOrder(version: BibleVersion): ProviderAdapter[] {
  if (version === "MSG") {
    return apiBibleAdapter.supports(version) ? [apiBibleAdapter] : [];
  }

  if (version === "NLT") {
    return nltAdapter.supports(version) ? [nltAdapter] : [];
  }

  if (version === "TPT") {
    return youVersionAdapter.supports(version) ? [youVersionAdapter] : [];
  }

  if (version === "KJV" || version === "NIV" || version === "AMP") {
    const providers: ProviderAdapter[] = [];

    if (youVersionAdapter.supports(version)) {
      providers.push(youVersionAdapter);
    }

    if (apiBibleAdapter.supports(version)) {
      providers.push(apiBibleAdapter);
    }

    return providers;
  }

  return [];
}

async function fetchScriptureWithFallback(
  ctx: ProviderContext,
): Promise<ProviderResult> {
  const providers = getProviderOrder(ctx.version);
  const errors: string[] = [];

  if (!providers.length) {
    throw new Error(`No provider configured for ${ctx.version}.`);
  }

  for (const provider of providers) {
    try {
      return await provider.fetch(ctx);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Unknown ${provider.name} error.`;
      errors.push(`${provider.name}: ${message}`);
    }
  }

  throw new Error(errors.join(" | "));
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

    const result = await fetchScriptureWithFallback({
      version,
      reference,
      parsed,
    });

    return NextResponse.json({
      ok: true,
      verses: result.verses,
      cached: false,
      provider: result.provider,
      fallback: result.fallback ?? false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown scripture provider error.";

    const accessDeniedLike =
      message.includes("Access denied") || message.includes("status 403");

    const notFoundLike =
      message.includes("That passage was not found") ||
      message.includes("No verses matched") ||
      message.includes("No verse text was returned");

    return NextResponse.json(
      { ok: false, error: message },
      { status: accessDeniedLike ? 403 : notFoundLike ? 404 : 500 },
    );
  }
}