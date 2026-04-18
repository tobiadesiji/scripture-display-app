import type { OutputState } from "@/types/scripture";

type Props = {
  state: OutputState;
};

export default function DisplayCanvas({ state }: Props) {
  const backgroundColor =
    state.mode === "black"
      ? "#000000"
      : state.mode === "white"
        ? "#ffffff"
        : state.theme.backgroundColor;

  const textColor = state.mode === "white" ? "#000000" : state.theme.textColor;

  if (state.mode !== "passage") {
    return (
      <div
        className="relative h-screen w-screen overflow-hidden"
        style={{ backgroundColor, color: textColor }}
      />
    );
  }

  const currentPage = state.bundle.pages[state.bundle.currentPageIndex] ?? [];

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="h-full w-full px-10 pb-8 pt-8">
        <div className="mx-auto grid h-full max-w-6xl grid-rows-[auto_1fr_auto] gap-6">
          <div className="flex justify-end">
            <div
              className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] opacity-85"
              style={{
                borderColor: textColor,
                color: textColor,
                backgroundColor:
                  textColor === "#000000"
                    ? "rgba(0,0,0,0.05)"
                    : "rgba(255,255,255,0.08)"
              }}
            >
              {state.bundle.translation}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden">
            <div
              className="h-full w-full overflow-hidden"
              style={{
                textAlign: state.theme.textAlign,
                lineHeight: state.theme.lineHeight,
                fontSize: `${state.theme.fontSize}px`
              }}
            >
              <div className="space-y-4">
                {currentPage.map((verse) => (
                  <p key={`${verse.chapter}-${verse.verse}`} className="font-medium">
                    <sup className="mr-2 text-[0.55em] opacity-70">{verse.verse}</sup>
                    {verse.text}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="min-h-[28px]">
            {state.theme.showReference ? (
              <p className="text-[0.85em] uppercase tracking-[0.2em] opacity-75">
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