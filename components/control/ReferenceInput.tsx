type Props = {
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export default function ReferenceInput({
  value,
  error,
  onChange,
  onSubmit,
}: Props) {
  return (
    <div>
      <label className="brand-label">Reference</label>

      <div className="relative">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          className={[
            "brand-input pr-20 text-base font-semibold sm:text-lg",
            error
              ? "border-red-400/70 focus:border-red-300 focus:ring-red-400/10"
              : "",
          ].join(" ")}
          placeholder="John 3:16, Psalm 23, Gen 1:1"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "reference-input-error" : undefined}
        />
        <button
          type="button"
          onClick={onSubmit}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-200 transition hover:bg-white/15"
        >
          Go
        </button>
      </div>

      {error ? (
        <div
          id="reference-input-error"
          className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          {error}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Accepts spaces, commas, or colons. Try John 3 16, John 3:16, Gen 1,1.
        </p>
      )}
    </div>
  );
}
