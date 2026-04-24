import type {
  BibleVersion,
  ProviderFetchArgs,
  ScriptureBundle,
  ScriptureProvider,
  Verse,
} from "./types";
import { getVersionConfig } from "./versionRegistry";

const BASE_URL = "https://api.scripture.api.bible/v1";

function getApiKey(): string {
  const key = process.env.API_BIBLE_KEY;
  if (!key) throw new Error("Missing API_BIBLE_KEY");
  return key;
}

async function apiBibleFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "api-key": getApiKey(),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`api.Bible request failed: ${res.status}`);
  }

  return res.json();
}

function normalizeText(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function filterRequestedVerses(
  verses: Verse[],
  verse?: number,
  endVerse?: number,
): Verse[] {
  if (!verse) return verses;
  if (!endVerse) return verses.filter((v) => v.number === verse);
  return verses.filter((v) => v.number >= verse && v.number <= endVerse);
}

export const apiBibleProvider: ScriptureProvider = {
  name: "apiBible",

  isVersionSupported(version: BibleVersion) {
    const config = getVersionConfig(version);
    return Boolean(config?.apiBibleId);
  },

  async fetchPassage({ version, reference, parsed }: ProviderFetchArgs): Promise<ScriptureBundle> {
    const config = getVersionConfig(version);

    if (!config?.apiBibleId) {
      throw new Error(`api.Bible does not support ${version} in registry`);
    }

    const json = await apiBibleFetch(
      `/bibles/${config.apiBibleId}/chapters/${encodeURIComponent(
        `${parsed.book}.${parsed.chapter}`
      )}/verses`
    );

    const items = Array.isArray(json?.data) ? json.data : [];

    const verses = items
      .map((item: any) => ({
        number: Number(item?.number),
        text: normalizeText(item?.content ?? ""),
      }))
      .filter((v: Verse) => Number.isFinite(v.number) && v.text);

    const requestedVerses = filterRequestedVerses(
      verses,
      parsed.verse,
      parsed.endVerse
    );

    if (!requestedVerses.length) {
      throw new Error(`No verses returned from api.Bible for ${reference}`);
    }

    return {
      provider: "apiBible",
      version,
      reference,
      book: parsed.book,
      chapter: parsed.chapter,
      verses: requestedVerses,
      copyright: json?.meta?.copyright,
    };
  },
};