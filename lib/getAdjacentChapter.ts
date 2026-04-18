export function getAdjacentChapter(chapter: number, direction: "prev" | "next", totalChapters: number) {
  if (direction === "prev") {
    return Math.max(1, chapter - 1);
  }
  return Math.min(totalChapters, chapter + 1);
}
