import type { BibleVersion, ParsedReference, Verse } from "@/types/scripture";

type ApiBibleVersion = "KJV" | "MSG" | "NIV" | "AMP";

type ApiBibleProxyResponse = {
  ok?: boolean;
  verses?: Verse[];
  error?: string;
  details?: string;
};

function assertApiBibleVersion(
  version: BibleVersion,
): asserts version is ApiBibleVersion {
  if (
    version !== "KJV" &&
    version !== "MSG" &&
    version !== "NIV" &&
    version !== "AMP"
  ) {
    throw new Error(`Unsupported API.Bible version: ${version}`);
  }
}

const chapterCache = new Map<string, Verse[]>();

function makeChapterCacheKey(version: ApiBibleVersion, parsed: ParsedReference) {
  return `${version}:${parsed.book.trim().toLowerCase()}:${parsed.chapter}`;
}

function sliceVersesForReference(verses: Verse[], parsed: ParsedReference): Verse[] {
  return verses.filter((verse) => {
    if (parsed.startVerse !== undefined && verse.verse < parsed.startVerse) return false;
    if (parsed.endVerse !== undefined && verse.verse > parsed.endVerse) return false;
    return true;
  });
}

export async function fetchApiBibleVerses(
  version: BibleVersion,
  reference: string,
  parsed: ParsedReference,
): Promise<Verse[]> {
  assertApiBibleVersion(version);

  const chapterCacheKey = makeChapterCacheKey(version, parsed);
  const cachedChapter = chapterCache.get(chapterCacheKey);

  if (cachedChapter?.length) {
    const sliced = sliceVersesForReference(cachedChapter, parsed);
    if (sliced.length) return sliced;
  }

  const response = await fetch("/api/api-bible", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      version,
      reference,
      parsed,
    }),
  });

  const data = (await response.json()) as ApiBibleProxyResponse;

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.details ||
        `API.Bible request failed with status ${response.status}.`,
    );
  }

  if (!data.verses?.length) {
    throw new Error(`That passage was not found in ${version}.`);
  }

  chapterCache.set(
    chapterCacheKey,
    [...data.verses].sort((a, b) => a.verse - b.verse),
  );

  const sliced = sliceVersesForReference(data.verses, parsed);
  if (!sliced.length) {
    throw new Error(`That passage was not found in ${version}.`);
  }

  return sliced;
}