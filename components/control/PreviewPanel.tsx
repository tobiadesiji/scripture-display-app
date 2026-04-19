import type { PassageBundle } from "@/types/scripture";

type Props = {
  bundle: PassageBundle | null;
  error: string;
};

export default function PreviewPanel({ bundle, error }: Props) {
  const currentPage = bundle ? bundle.pages[bundle.currentPageIndex] ?? [] : [];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">Preview</h2>

        {bundle ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
              {bundle.translation}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              {bundle.reference}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              Page {bundle.currentPageIndex + 1}/{bundle.pages.length}
            </span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-900 bg-red-950/50 px-4 py-3">
          <p className="text-sm font-medium text-red-200">Unable to load passage</p>
          <p className="mt-1 text-sm text-red-300">{error}</p>
        </div>
      ) : null}

      {!bundle && !error ? (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-5 text-sm text-slate-400">
          Search a passage to preview it before sending it to the display window.
        </div>
      ) : null}

      {bundle ? (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="space-y-4 text-slate-100">
            {currentPage.map((verse) => (
              <p
                key={`${verse.book ?? "book"}-${verse.chapter}-${verse.verse}`}
                className="text-lg leading-8"
              >
                <span className="mr-2 align-top text-sm font-semibold text-slate-400">
                  {verse.verse}
                </span>
                <span>{verse.text}</span>
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}