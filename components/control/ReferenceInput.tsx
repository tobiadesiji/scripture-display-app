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
      <label className="mb-2 block text-sm font-medium text-slate-200">
        Reference
      </label>

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
          "w-full rounded-xl border bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500",
          error
            ? "border-red-500 focus:border-red-400"
            : "border-slate-700 focus:border-slate-500",
        ].join(" ")}
        placeholder="e.g. John 3:16, Gen 1 1, 1Cor13:4, Psalm 23"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "reference-input-error" : undefined}
      />

      {error ? (
        <p id="reference-input-error" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          You can use spaces, commas, or colons. Example: John 3 16, John 3:16,
          Gen 1,1
        </p>
      )}
    </div>
  );
}