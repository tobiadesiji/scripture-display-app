import type { BibleVersion, ScriptureProviderName } from "./types";

type ProviderVersionMap = {
  primary: ScriptureProviderName;
  fallback?: ScriptureProviderName;
  youversionId?: number;
  apiBibleId?: string;
};

export const VERSION_REGISTRY: Record<BibleVersion, ProviderVersionMap> = {
  NLT:  { primary: "youversion", fallback: "apiBible", youversionId: 0, apiBibleId: "" },
  NIV:  { primary: "youversion", fallback: "apiBible", youversionId: 111, apiBibleId: "" },
  AMP:  { primary: "youversion", fallback: "apiBible", youversionId: 0, apiBibleId: "" },
  MSG:  { primary: "youversion", fallback: "apiBible", youversionId: 0, apiBibleId: "" },
  KJV:  { primary: "youversion", fallback: "apiBible", youversionId: 0, apiBibleId: "" },
  NKJV: { primary: "youversion", fallback: "apiBible", youversionId: 0, apiBibleId: "" },
  TPT:  { primary: "youversion", fallback: "apiBible", youversionId: 0, apiBibleId: "" },
};

export function getVersionConfig(version: BibleVersion) {
  return VERSION_REGISTRY[version];
}