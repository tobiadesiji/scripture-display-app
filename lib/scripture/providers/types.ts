export type BibleVersion =
  | "NLT"
  | "NIV"
  | "AMP"
  | "MSG"
  | "KJV"
  | "NKJV"
  | "TPT";

export type ScriptureProviderName = "youversion" | "apiBible";

export type ParsedReference = {
  book: string;
  chapter: number;
  verse?: number;
  endVerse?: number;
};

export type Verse = {
  number: number;
  text: string;
};

export type ScriptureBundle = {
  provider: ScriptureProviderName;
  version: BibleVersion;
  reference: string;
  book: string;
  chapter: number;
  verses: Verse[];
  copyright?: string;
};

export type ProviderFetchArgs = {
  version: BibleVersion;
  reference: string;
  parsed: ParsedReference;
};

export type ScriptureProvider = {
  name: ScriptureProviderName;
  isVersionSupported: (version: BibleVersion) => boolean;
  fetchPassage: (args: ProviderFetchArgs) => Promise<ScriptureBundle>;
};