import type {
  OutputState,
  ScriptureFontFamily,
  ScriptureTextOutline,
  ScriptureTextShadow,
} from "@/types/scripture";

type Props = {
  state: OutputState | null | undefined;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  sessionId: string;
};

const FOOTER_SAFE_SPACE = 72;

function getFontFamily(fontFamily: ScriptureFontFamily) {
  switch (fontFamily) {
    case "montserrat":
      return "Montserrat, Arial, sans-serif";
    case "merriweather":
      return "Merriweather, Georgia, serif";
    case "source-sans":
      return '"Source Sans 3", Arial, sans-serif';
    case "inter":
    default:
      return "Inter, Arial, sans-serif";
  }
}

function getTextShadow(shadow: ScriptureTextShadow) {
  switch (shadow) {
    case "soft":
      return "0 2px 8px rgba(0,0,0,0.45)";
    case "medium":
      return "0 3px 12px rgba(0,0,0,0.6)";
    case "strong":
      return "0 4px 18px rgba(0,0,0,0.8)";
    case "none":
    default:
      return "none";
  }
}

function getTextStroke(outline: ScriptureTextOutline) {
  switch (outline) {
    case "thin":
      return "0.75px rgba(0,0,0,0.85)";
    case "medium":
      return "1.25px rgba(0,0,0,0.9)";
    case "none":
    default:
      return "0px transparent";
  }
}

export default function DisplayCanvas({
  state,
  isFullscreen,
  onToggleFullscreen,
}: Props) {
  if (!state) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="absolute left-4 top-4 z-20 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-85 transition hover:opacity-100"
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>

        <div className="flex h-full items-center justify-center px-6 text-center">
          <p className="text-lg text-white/70">Waiting for presentation…</p>
        </div>
      </div>
    );
  }

  const backgroundColor =
    state.mode === "black"
      ? "#000000"
      : state.mode === "white"
        ? "#ffffff"
        : state.theme.backgroundColor;

  const textColor =
    state.mode === "white" ? "#000000" : state.theme.textColor;

  const chipStyle = {
    borderColor: textColor,
    color: textColor,
    backgroundColor:
      textColor === "#000000"
        ? "rgba(0,0,0,0.05)"
        : "rgba(255,255,255,0.08)",
  };

  const textStyle = {
    fontFamily: getFontFamily(state.theme.fontFamily),
    textShadow: getTextShadow(state.theme.textShadow),
    WebkitTextStroke: getTextStroke(state.theme.textOutline),
  } as const;

  const fullscreenButton = (
    <button
      type="button"
      onClick={onToggleFullscreen}
      className="absolute left-4 top-4 z-20 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-85 transition hover:opacity-100"
      style={chipStyle}
    >
      {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
    </button>
  );

  if (state.mode === "text") {
    return (
      <div
        className="relative h-screen w-screen overflow-hidden"
        style={{ backgroundColor, color: textColor }}
      >
        {fullscreenButton}

        <div className="flex h-full w-full items-center justify-center px-10 py-12">
          <div
            className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center text-center"
            style={{
              textAlign: state.theme.textAlign,
              lineHeight: state.theme.lineHeight,
              ...textStyle,
            }}
          >
            {state.title ? (
              <p
                className="mb-6 text-[0.42em] font-bold uppercase tracking-[0.24em] opacity-80"
                style={{ fontSize: `${state.theme.fontSize}px` }}
              >
                {state.title}
              </p>
            ) : null}

            <div
              className="whitespace-pre-wrap font-bold"
              style={{ fontSize: `${state.theme.fontSize}px` }}
            >
              {state.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.mode !== "passage") {
    return (
      <div
        className="relative h-screen w-screen overflow-hidden"
        style={{ backgroundColor, color: textColor }}
      >
        {fullscreenButton}
      </div>
    );
  }

  const currentPage = state.bundle.pages[state.bundle.currentPageIndex] ?? [];

  const totalCharacters = currentPage.reduce(
    (sum, verse) => sum + verse.text.length,
    0,
  );

  const longestVerseLength = currentPage.reduce(
    (max, verse) => Math.max(max, verse.text.length),
    0,
  );

  const shouldCenterContent =
    currentPage.length <= 1 &&
    totalCharacters <= 220 &&
    longestVerseLength <= 180;

  const contentAlignmentClass = shouldCenterContent
    ? "items-center"
    : "items-start";

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ backgroundColor, color: textColor }}
    >
      {fullscreenButton}

      <div className="h-full w-full px-10 pb-8 pt-8">
        <div className="mx-auto grid h-full max-w-6xl grid-rows-[auto_1fr_auto] gap-6">
          <div className="flex justify-end">
            <div
              className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] opacity-85"
              style={chipStyle}
            >
              {state.bundle.translation}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden">
            <div
              className={`flex h-full w-full justify-center overflow-hidden ${contentAlignmentClass}`}
              style={{
                textAlign: state.theme.textAlign,
                lineHeight: state.theme.lineHeight,
                fontSize: `${state.theme.fontSize}px`,
                paddingBottom: `${FOOTER_SAFE_SPACE}px`,
                ...textStyle,
              }}
            >
              <div className="w-full max-w-5xl">
                <div className="space-y-4">
                  {currentPage.map((verse, index) => (
                    <p
                      key={`${verse.chapter}-${verse.verse}-${verse.label ?? ""}-${index}`}
                      className="font-bold"
                    >
                      <sup className="mr-2 text-[0.55em] font-bold opacity-80">
                        {verse.label ?? verse.verse}
                      </sup>
                      {verse.text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            {state.theme.showReference ? (
              <p
                className="absolute bottom-0 left-0 text-[0.85em] uppercase tracking-[0.2em] opacity-75"
                style={textStyle}
              >
                {state.bundle.reference} · {state.bundle.translation} · Page{" "}
                {state.bundle.currentPageIndex + 1}/{state.bundle.pages.length}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}