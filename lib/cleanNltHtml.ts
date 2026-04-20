import type { Verse } from "@/types/scripture";

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

function normaliseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function stripHtml(input: string): string {
  return decodeEntities(
    input
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<\/div>/gi, " ")
      .replace(/<\/h\d>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function removeFootnotes(input: string): string {
  let text = input;

  text = text.replace(/\[[^\]]*]/g, " ");
  text = text.replace(/\*/g, " ");

  return text;
}

function cleanVerseHtml(input: string): string {
  let text = input;

  // remove headings and chapter labels inside verse block
  text = text.replace(/<h2[^>]*>[\s\S]*?<\/h2>/gi, " ");
  text = text.replace(/<h3[^>]*>[\s\S]*?<\/h3>/gi, " ");

  // remove NLT inline translation note spans completely
  text = text.replace(/<span class="tn"[^>]*>[\s\S]*?<\/span>/gi, " ");
  text = text.replace(/<a class="a-tn"[^>]*>[\s\S]*?<\/a>/gi, " ");

  // remove verse number span so it doesn’t get duplicated in text
  text = text.replace(/<span class="vn"[^>]*>\d+<\/span>/gi, " ");

  text = removeFootnotes(text);
  text = stripHtml(text);

  return normaliseWhitespace(text);
}

export function cleanNltHtmlToVerses(input: string, fallbackChapter: number): Verse[] {
  const verses: Verse[] = [];

  const verseBlockPattern =
    /<verse_export\b[^>]*\bch="(\d+)"[^>]*\bvn="(\d+)"[^>]*>([\s\S]*?)<\/verse_export>/gi;

  for (const match of input.matchAll(verseBlockPattern)) {
    const chapter = Number.parseInt(match[1], 10) || fallbackChapter;
    const verse = Number.parseInt(match[2], 10);
    const innerHtml = match[3] ?? "";
    const text = cleanVerseHtml(innerHtml);

    if (!Number.isInteger(verse) || !text) {
      continue;
    }

    verses.push({
      chapter,
      verse,
      text,
    });
  }

  if (verses.length > 0) {
    const deduped = new Map<number, Verse>();

    for (const verse of verses) {
      if (!deduped.has(verse.verse)) {
        deduped.set(verse.verse, verse);
      }
    }

    return Array.from(deduped.values()).sort((a, b) => a.verse - b.verse);
  }

  // fallback if verse_export blocks are missing
  const fallbackText = normaliseWhitespace(stripHtml(removeFootnotes(input)));

  return fallbackText
    ? [
        {
          chapter: fallbackChapter,
          verse: 1,
          text: fallbackText,
        },
      ]
    : [];
}