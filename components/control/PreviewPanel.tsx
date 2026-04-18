import type { PassageBundle } from "@/types/scripture";

type Props = {
  bundle: PassageBundle | null;
  error: string;
};

export default function PreviewPanel({ bundle, error }: Props) {
  const currentPage = bundle ? bundle.pages[bundle.currentPageIndex] ?? [] : [];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Preview</h2>
        {bundle ? (
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
            {bundle.reference} · Page {bundle.currentPageIndex + 1}/{bundle.pages.length}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!bundle && !error ? (
        <p className="mt-4 text-slate-400">
          Search a passage to preview it before sending it to the display window.
        </p>
      ) : null}

      {bundle ? (
        <div className="mt-5 space-y-3 text-slate-200">
          {currentPage.map((verse) => (
            <p key={`${verse.chapter}-${verse.verse}`}>
              <span className="mr-2 text-sm text-slate-400">{verse.verse}</span>
              {verse.text}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
