import type { Verse } from "@/types/scripture";

function normaliseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function decodeEntities(input: string): string {
  if (typeof window !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = input;
    return textarea.value;
  }

  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(input: string): string {
  return decodeEntities(input.replace(/<[^>]+>/g, " "));
}

function removeApiHeader(input: string): string {
  return input.replace(/^\s*\d*\s*NLT\s*API\s*/i, "").trim();
}

function removeFootnotes(input: string): string {
  let text = input;

  // Remove only the specific inline footnote sentence itself,
  // not everything after it.
  text = text.replace(
    /\*\s*\d+:\d+\s+Or\s+[^.?!]+[.?!]?/gi,
    " "
  );

  // Remove bracket notes
  text = text.replace(/\[[^\]]*]/g, " ");

  // Remove any remaining standalone asterisks
  text = text.replace(/\*/g, " ");

  return text;
}

function splitIntoVerseChunks(input: string): Array<{ verse: number; text: string }> {
  const matches = Array.from(input.matchAll(/(?:^|\s)(\d+)\s/g));

  if (matches.length === 0) {
    return [];
  }

  const chunks: Array<{ verse: number; text: string }> = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    const verseNumber = Number(current[1]);
    const start = (current.index ?? 0) + current[0].length;
    const end = next ? (next.index ?? input.length) : input.length;

    const verseText = normaliseWhitespace(input.slice(start, end));

    if (!Number.isInteger(verseNumber) || !verseText) continue;

    chunks.push({
      verse: verseNumber,
      text: verseText
    });
  }

  return chunks;
}

export function cleanNltHtmlToVerses(input: string, fallbackChapter: number): Verse[] {
  const cleaned = normaliseWhitespace(
    removeFootnotes(
      removeApiHeader(
        stripHtml(input)
      )
    )
  );

  const chunks = splitIntoVerseChunks(cleaned);

  if (chunks.length > 0) {
    return chunks
      .map((chunk) => ({
        chapter: fallbackChapter,
        verse: chunk.verse,
        text: chunk.text
      }))
      .sort((a, b) => a.verse - b.verse);
  }

  return cleaned
    ? [
        {
          chapter: fallbackChapter,
          verse: 1,
          text: cleaned
        }
      ]
    : [];
}