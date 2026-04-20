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

const verseCache = new Map<string, Verse[]>();

function makeCacheKey(version: ApiBibleVersion, reference: string) {
  return `${version}:${reference.trim().toLowerCase()}`;
}

export async function fetchApiBibleVerses(
  version: BibleVersion,
  reference: string,
  parsed: ParsedReference,
): Promise<Verse[]> {
  assertApiBibleVersion(version);

  const cacheKey = makeCacheKey(version, reference);
  const cached = verseCache.get(cacheKey);
  if (cached) return cached;

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

  verseCache.set(cacheKey, data.verses);
  return data.verses;
}