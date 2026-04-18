type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export default function ReferenceInput({ value, onChange, onSubmit }: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">Reference</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSubmit();
        }}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500"
        placeholder="e.g. John 3:16-17 or Psalm 23"
      />
    </div>
  );
}
