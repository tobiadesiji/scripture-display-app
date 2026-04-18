import type { ThemeSettings, Verse } from "@/types/scripture";

type ViewportSize = {
  width: number;
  height: number;
};

const DEFAULT_VIEWPORT: ViewportSize = {
  width: 1400,
  height: 900
};

// These values should mirror DisplayCanvas spacing closely
const HORIZONTAL_PADDING = 80; // px-10 left+right
const TOP_PADDING = 32; // pt-8
const BOTTOM_PADDING = 32; // pb-8
const GRID_GAP_TOTAL = 48; // gap-6 between 3 rows
const BADGE_ROW_HEIGHT = 48;
const FOOTER_ROW_HEIGHT = 28;
const MAX_CONTENT_WIDTH = 1152; // max-w-6xl

function getContentWidth(viewport: ViewportSize) {
  return Math.min(MAX_CONTENT_WIDTH, Math.max(320, viewport.width - HORIZONTAL_PADDING));
}

function getTextLaneHeight(viewport: ViewportSize) {
  return Math.max(
    120,
    viewport.height -
      TOP_PADDING -
      BOTTOM_PADDING -
      GRID_GAP_TOTAL -
      BADGE_ROW_HEIGHT -
      FOOTER_ROW_HEIGHT
  );
}

function createVerseElement(verse: Verse, spacingPx: number) {
  const p = document.createElement("p");
  p.style.margin = "0";
  p.style.fontWeight = "500";

  const sup = document.createElement("sup");
  sup.textContent = String(verse.verse);
  sup.style.marginRight = "0.5em";
  sup.style.fontSize = "0.55em";
  sup.style.opacity = "0.7";

  p.appendChild(sup);
  p.appendChild(document.createTextNode(verse.text));

  if (spacingPx > 0) {
    p.style.marginBottom = `${spacingPx}px`;
  }

  return p;
}

export function paginatePassageMeasured(
  verses: Verse[],
  theme: ThemeSettings,
  viewport: ViewportSize = DEFAULT_VIEWPORT
): Verse[][] {
  if (typeof document === "undefined") {
    return verses.length ? [verses] : [[]];
  }

  if (verses.length === 0) {
    return [[]];
  }

  const availableHeight = getTextLaneHeight(viewport);
  const contentWidth = getContentWidth(viewport);
  const verseSpacing = 16; // matches space-y-4 visually

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
  content.style.fontFamily = "Arial, Helvetica, sans-serif";
  content.style.fontSize = `${theme.fontSize}px`;
  content.style.lineHeight = String(theme.lineHeight);
  content.style.textAlign = theme.textAlign;
  content.style.color = theme.textColor;
  content.style.boxSizing = "border-box";

  host.appendChild(content);
  document.body.appendChild(host);

  const pages: Verse[][] = [];
  let currentPage: Verse[] = [];

  const rebuildContent = (pageVerses: Verse[]) => {
    content.innerHTML = "";

    pageVerses.forEach((verse, index) => {
      const isLast = index === pageVerses.length - 1;
      const el = createVerseElement(verse, isLast ? 0 : verseSpacing);
      content.appendChild(el);
    });
  };

  for (const verse of verses) {
    const candidate = [...currentPage, verse];
    rebuildContent(candidate);

    if (content.scrollHeight > availableHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [verse];
      rebuildContent(currentPage);
    } else {
      currentPage = candidate;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  document.body.removeChild(host);

  return pages.length ? pages : [[]];
}