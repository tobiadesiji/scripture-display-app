import type { ThemeSettings, Verse } from "@/types/scripture";

type ViewportSize = {
  width: number;
  height: number;
};

const DEFAULT_VIEWPORT: ViewportSize = {
  width: 1400,
  height: 900,
};

// These values should mirror DisplayCanvas closely
const HORIZONTAL_PADDING = 80; // px-10 left+right
const TOP_PADDING = 32; // pt-8
const BOTTOM_PADDING = 48; // pb-12
const GRID_GAP_TOTAL = 48; // gap-6 between 3 rows
const BADGE_ROW_HEIGHT = 48;
const FOOTER_ROW_HEIGHT = 56; // grid-rows-[auto_1fr_56px]
const OUTER_MAX_WIDTH = 1152; // max-w-6xl
const INNER_TEXT_MAX_WIDTH = 1024; // max-w-5xl
const MIN_CONTENT_HEIGHT = 120;
const VERSE_SPACING = 16; // space-y-4

function getContentWidth(viewport: ViewportSize) {
  const outerWidth = Math.min(
    OUTER_MAX_WIDTH,
    Math.max(320, viewport.width - HORIZONTAL_PADDING),
  );

  return Math.min(INNER_TEXT_MAX_WIDTH, outerWidth);
}

function getTextLaneHeight(viewport: ViewportSize) {
  return Math.max(
    MIN_CONTENT_HEIGHT,
    viewport.height -
      TOP_PADDING -
      BOTTOM_PADDING -
      GRID_GAP_TOTAL -
      BADGE_ROW_HEIGHT -
      FOOTER_ROW_HEIGHT,
  );
}

function createVerseElement(verse: Verse, spacingPx: number) {
  const p = document.createElement("p");
  p.style.margin = "0";
  p.style.fontWeight = "700";

  const sup = document.createElement("sup");
  sup.textContent = String(verse.verse);
  sup.style.marginRight = "0.5em";
  sup.style.fontSize = "0.55em";
  sup.style.fontWeight = "700";
  sup.style.opacity = "0.8";

  p.appendChild(sup);
  p.appendChild(document.createTextNode(verse.text));

  if (spacingPx > 0) {
    p.style.marginBottom = `${spacingPx}px`;
  }

  return p;
}

function createMeasurementHost(
  theme: ThemeSettings,
  contentWidth: number,
): { host: HTMLDivElement; content: HTMLDivElement } {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = `${contentWidth}px`;
  host.style.visibility = "hidden";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";

  const content = document.createElement("div");
  content.style.width = "100%";
  content.style.maxWidth = `${INNER_TEXT_MAX_WIDTH}px`;
  content.style.fontFamily = "Arial, Helvetica, sans-serif";
  content.style.fontSize = `${theme.fontSize}px`;
  content.style.lineHeight = String(theme.lineHeight);
  content.style.textAlign = theme.textAlign;
  content.style.color = theme.textColor;
  content.style.boxSizing = "border-box";

  host.appendChild(content);
  document.body.appendChild(host);

  return { host, content };
}

function rebuildContent(
  content: HTMLDivElement,
  pageVerses: Verse[],
  spacingPx: number,
) {
  content.innerHTML = "";

  pageVerses.forEach((verse, index) => {
    const isLast = index === pageVerses.length - 1;
    const el = createVerseElement(verse, isLast ? 0 : spacingPx);
    content.appendChild(el);
  });
}

function measureVersesHeight(
  content: HTMLDivElement,
  verses: Verse[],
  spacingPx: number,
) {
  rebuildContent(content, verses, spacingPx);
  return content.scrollHeight;
}

function splitVerseIntoChunks(
  verse: Verse,
  availableHeight: number,
  content: HTMLDivElement,
  spacingPx: number,
): Verse[] {
  const fullHeight = measureVersesHeight(content, [verse], 0);
  if (fullHeight <= availableHeight) {
    return [verse];
  }

  const words = verse.text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return [verse];
  }

  const chunks: Verse[] = [];
  let currentWords: string[] = [];

  for (const word of words) {
    const candidateWords = [...currentWords, word];
    const candidateVerse: Verse = {
      ...verse,
      text: candidateWords.join(" "),
    };

    const candidateHeight = measureVersesHeight(content, [candidateVerse], 0);

    if (candidateHeight <= availableHeight || currentWords.length === 0) {
      currentWords = candidateWords;
      continue;
    }

    chunks.push({
      ...verse,
      text: currentWords.join(" "),
    });

    currentWords = [word];
  }

  if (currentWords.length > 0) {
    chunks.push({
      ...verse,
      text: currentWords.join(" "),
    });
  }

  if (chunks.length <= 1) {
    return [verse];
  }

  return chunks;
}

function expandOversizedVerses(
  verses: Verse[],
  availableHeight: number,
  content: HTMLDivElement,
  spacingPx: number,
): Verse[] {
  const expanded: Verse[] = [];

  for (const verse of verses) {
    const chunks = splitVerseIntoChunks(
      verse,
      availableHeight,
      content,
      spacingPx,
    );
    expanded.push(...chunks);
  }

  return expanded;
}

export function paginatePassageMeasured(
  verses: Verse[],
  theme: ThemeSettings,
  viewport: ViewportSize = DEFAULT_VIEWPORT,
): Verse[][] {
  if (typeof document === "undefined") {
    return verses.length ? [verses] : [[]];
  }

  if (verses.length === 0) {
    return [[]];
  }

  const availableHeight = getTextLaneHeight(viewport);
  const contentWidth = getContentWidth(viewport);

  const { host, content } = createMeasurementHost(theme, contentWidth);

  try {
    const preparedVerses = expandOversizedVerses(
      verses,
      availableHeight,
      content,
      VERSE_SPACING,
    );

    const pages: Verse[][] = [];
    let currentPage: Verse[] = [];

    for (const verse of preparedVerses) {
      const candidate = [...currentPage, verse];
      const candidateHeight = measureVersesHeight(
        content,
        candidate,
        VERSE_SPACING,
      );

      if (candidateHeight > availableHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [verse];
      } else {
        currentPage = candidate;
      }
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages.length ? pages : [[]];
  } finally {
    document.body.removeChild(host);
  }
}