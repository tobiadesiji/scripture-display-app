import type { ThemeSettings, Verse } from "@/types/scripture";

function estimatedPageBudget(theme: ThemeSettings) {
  const base = 560;
  const fontPenalty = Math.max(0, theme.fontSize - 40) * 14;
  const linePenalty = Math.max(0, (theme.lineHeight - 1.25) * 280);

  return Math.max(120, Math.floor(base - fontPenalty - linePenalty));
}

function verseWeight(verse: Verse) {
  return `${verse.verse} ${verse.text}`.length + 28;
}

export function paginatePassage(verses: Verse[], theme: ThemeSettings): Verse[][] {
  if (verses.length === 0) return [[]];

  const budget = estimatedPageBudget(theme);
  const pages: Verse[][] = [];

  let currentPage: Verse[] = [];
  let currentWeight = 0;

  for (const verse of verses) {
    const weight = verseWeight(verse);

    if (currentPage.length > 0 && currentWeight + weight > budget) {
      pages.push(currentPage);
      currentPage = [verse];
      currentWeight = weight;
      continue;
    }

    currentPage.push(verse);
    currentWeight += weight;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}