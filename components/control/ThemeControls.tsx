import type { ThemeSettings } from "@/types/scripture";

type Props = {
  value: ThemeSettings;
  onChange: (value: ThemeSettings) => void;
};

export default function ThemeControls({ value, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold text-white">Display Theme</h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Font size</span>
          <input
            type="range"
            min="28"
            max="96"
            step="2"
            value={value.fontSize}
            onChange={(event) => onChange({ ...value, fontSize: Number(event.target.value) })}
            className="w-full"
          />
          <span className="mt-1 block text-xs text-slate-400">{value.fontSize}px</span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Line height</span>
          <input
            type="range"
            min="1.1"
            max="2"
            step="0.05"
            value={value.lineHeight}
            onChange={(event) => onChange({ ...value, lineHeight: Number(event.target.value) })}
            className="w-full"
          />
          <span className="mt-1 block text-xs text-slate-400">{value.lineHeight}</span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Text color</span>
          <input
            type="color"
            value={value.textColor}
            onChange={(event) => onChange({ ...value, textColor: event.target.value })}
            className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 p-1"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Background color</span>
          <input
            type="color"
            value={value.backgroundColor}
            onChange={(event) => onChange({ ...value, backgroundColor: event.target.value })}
            className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 p-1"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Text alignment</span>
          <select
            value={value.textAlign}
            onChange={(event) =>
              onChange({ ...value, textAlign: event.target.value as ThemeSettings["textAlign"] })
            }
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"
          >
            <option value="center">Center</option>
            <option value="left">Left</option>
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
          <input
            type="checkbox"
            checked={value.showReference}
            onChange={(event) => onChange({ ...value, showReference: event.target.checked })}
          />
          <span className="text-sm text-slate-300">Show reference footer</span>
        </label>
      </div>
    </section>
  );
}
