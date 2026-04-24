import type {
  BibleVersion,
  ParsedReference,
  ProviderFetchArgs,
  ScriptureBundle,
  ScriptureProvider,
  Verse,
} from "./types";
import { getVersionConfig } from "./versionRegistry";

const BASE_URL = "https://api.youversion.com/v1";

const BOOK_USFM_MAP: Record<string, string> = {
  Genesis: "GEN",
  Exodus: "EXO",
  Leviticus: "LEV",
  Numbers: "NUM",
  Deuteronomy: "DEU",
  Joshua: "JOS",
  Judges: "JDG",
  Ruth: "RUT",
  "1 Samuel": "1SA",
  "2 Samuel": "2SA",
  "1 Kings": "1KI",
  "2 Kings": "2KI",
  "1 Chronicles": "1CH",
  "2 Chronicles": "2CH",
  Ezra: "EZR",
  Nehemiah: "NEH",
  Esther: "EST",
  Job: "JOB",
  Psalms: "PSA",
  Proverbs: "PRO",
  Ecclesiastes: "ECC",
  "Song of Solomon": "SNG",
  Isaiah: "ISA",
  Jeremiah: "JER",
  Lamentations: "LAM",
  Ezekiel: "EZK",
  Daniel: "DAN",
  Hosea: "HOS",
  Joel: "JOL",
  Amos: "AMO",
  Obadiah: "OBA",
  Jonah: "JON",
  Micah: "MIC",
  Nahum: "NAM",
  Habakkuk: "HAB",
  Zephaniah: "ZEP",
  Haggai: "HAG",
  Zechariah: "ZEC",
  Malachi: "MAL",
  Matthew: "MAT",
  Mark: "MRK",
  Luke: "LUK",
  John: "JHN",
  Acts: "ACT",
  Romans: "ROM",
  "1 Corinthians": "1CO",
  "2 Corinthians": "2CO",
  Galatians: "GAL",
  Ephesians: "EPH",
  Philippians: "PHP",
  Colossians: "COL",
  "1 Thessalonians": "1TH",
  "2 Thessalonians": "2TH",
  "1 Timothy": "1TI",
  "2 Timothy": "2TI",
  Titus: "TIT",
  Philemon: "PHM",
  Hebrews: "HEB",
  James: "JAS",
  "1 Peter": "1PE",
  "2 Peter": "2PE",
  "1 John": "1JN",
  "2 John": "2JN",
  "3 John": "3JN",
  Jude: "JUD",
  Revelation: "REV",
};

function getAppKey(): string {
  const key = process.env.YOUVERSION_APP_KEY;
  if (!key) throw new Error("Missing YOUVERSION_APP_KEY");
  return key;
}

async function yvFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-YVP-App-Key": getAppKey(),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`YouVersion request failed: ${res.status}`);
  }

  return res.json();
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function filterRequestedVerses(
  verses: Verse[],
  parsed: ParsedReference,
): Verse[] {
  if (!parsed.verse) return verses;
  if (!parsed.endVerse) return verses.filter((v) => v.number === parsed.verse);
  return verses.filter((v) => v.number >= parsed.verse! && v.number <= parsed.endVerse!);
}

async function fetchChapterVerses(
  versionId: number,
  parsed: ParsedReference,
): Promise<Verse[]> {
  const usfm = BOOK_USFM_MAP[parsed.book];
  if (!usfm) {
    throw new Error(`Unsupported book mapping for ${parsed.book}`);
  }

  const json = await yvFetch(
    `/bibles/${versionId}/books/${usfm}/chapters/${parsed.chapter}/verses`
  );

  const items = Array.isArray(json?.data) ? json.data : [];

  return items
    .map((item: any) => ({
      number: Number(item?.verse_number ?? item?.number ?? item?.ordinal),
      text: normalizeText(item?.content ?? item?.text ?? ""),
    }))
    .filter((v: Verse) => Number.isFinite(v.number) && v.text);
}

export const youVersionProvider: ScriptureProvider = {
  name: "youversion",

  isVersionSupported(version: BibleVersion) {
    const config = getVersionConfig(version);
    return Boolean(config?.youversionId);
  },

  async fetchPassage({ version, reference, parsed }: ProviderFetchArgs): Promise<ScriptureBundle> {
    const config = getVersionConfig(version);

    if (!config?.youversionId) {
      throw new Error(`YouVersion does not support ${version} in registry`);
    }

    const verses = await fetchChapterVerses(config.youversionId, parsed);
    const requestedVerses = filterRequestedVerses(verses, parsed);

    if (!requestedVerses.length) {
      throw new Error(`No verses returned from YouVersion for ${reference}`);
    }

    return {
      provider: "youversion",
      version,
      reference,
      book: parsed.book,
      chapter: parsed.chapter,
      verses: requestedVerses,
    };
  },
};