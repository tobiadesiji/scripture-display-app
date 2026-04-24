import type { BibleVersion, ProviderFetchArgs, ScriptureBundle, ScriptureProvider } from "./types";
import { getVersionConfig } from "./versionRegistry";
import { youVersionProvider } from "./youversion";
import { apiBibleProvider } from "./apiBible";

const PROVIDERS: Record<string, ScriptureProvider> = {
  youversion: youVersionProvider,
  apiBible: apiBibleProvider,
};

function getProviderOrder(version: BibleVersion): ScriptureProvider[] {
  const config = getVersionConfig(version);
  if (!config) return [];

  const order = [config.primary, config.fallback].filter(Boolean) as string[];
  return order.map((name) => PROVIDERS[name]).filter(Boolean);
}

function isRetryableProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  );
}

export async function fetchScriptureWithFallback(
  args: ProviderFetchArgs,
): Promise<ScriptureBundle> {
  const providers = getProviderOrder(args.version);
  const errors: string[] = [];

  for (const provider of providers) {
    if (!provider.isVersionSupported(args.version)) {
      errors.push(`${provider.name}: version unsupported`);
      continue;
    }

    try {
      return await provider.fetchPassage(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider.name}: ${message}`);

      // Move to fallback for both unsupported/not found and transient failures.
      if (isRetryableProviderError(error) || true) {
        continue;
      }
    }
  }

  throw new Error(`All providers failed for ${args.reference}. ${errors.join(" | ")}`);
}