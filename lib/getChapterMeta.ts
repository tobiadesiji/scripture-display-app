import type { Verse } from "@/types/scripture";

export function getChapterCount(verses: Verse[]): number {
  return Math.max(...verses.map((verse) => verse.chapter), 0);
}
