import type { Verse } from "@/types/scripture";

export async function loadBook(slug: string): Promise<Verse[]> {
  const response = await fetch(`/data/web/${slug}.json`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load book file: ${slug}.json`);
  }

  const raw = (await response.json()) as Array<Record<string, unknown>>;

  return raw
    .map((item) => ({
      book: String(item.book ?? ""),
      chapter: Number(item.chapter),
      verse: Number(item.verse),
      text: String(item.text ?? "")
    }))
    .filter((item) => Number.isFinite(item.chapter) && Number.isFinite(item.verse) && item.text);
}
