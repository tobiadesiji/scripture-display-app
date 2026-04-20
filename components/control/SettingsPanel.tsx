import type {
  ScriptureFontFamily,
  ScriptureTextOutline,
  ScriptureTextShadow,
  ThemeSettings,
} from "@/types/scripture";

type Props = {
  theme: ThemeSettings;
  onThemeChange: (theme: ThemeSettings) => void;
};

export default function SettingsPanel({ theme, onThemeChange }: Props) {
  const update = <K extends keyof ThemeSettings>(
    key: K,
    value: ThemeSettings[K],
  ) => {
    onThemeChange({
      ...theme,
      [key]: value,
    });
  };

  return (
    <section className="bg-slate-900 p-0">
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Font Size
            </label>
            <input
              type="range"
              min={28}
              max={90}
              step={1}
              value={theme.fontSize}
              onChange={(event) =>
                update("fontSize", Number(event.target.value))
              }
              className="w-full"
            />
            <p className="mt-1 text-xs text-slate-500">{theme.fontSize}px</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Line Height
            </label>
            <input
              type="range"
              min={1}
              max={2}
              step={0.05}
              value={theme.lineHeight}
              onChange={(event) =>
                update("lineHeight", Number(event.target.value))
              }
              className="w-full"
            />
            <p className="mt-1 text-xs text-slate-500">
              {theme.lineHeight.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Text Align
            </label>
            <select
              value={theme.textAlign}
              onChange={(event) =>
                update("textAlign", event.target.value as "left" | "center")
              }
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"
            >
              <option value="center">Center</option>
              <option value="left">Left</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Font Family
            </label>
            <select
              value={theme.fontFamily}
              onChange={(event) =>
                update("fontFamily", event.target.value as ScriptureFontFamily)
              }
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"
            >
              <option value="inter">Inter</option>
              <option value="montserrat">Montserrat</option>
              <option value="merriweather">Merriweather</option>
              <option value="source-sans">Source Sans 3</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Text Shadow
            </label>
            <select
              value={theme.textShadow}
              onChange={(event) =>
                update("textShadow", event.target.value as ScriptureTextShadow)
              }
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"
            >
              <option value="none">None</option>
              <option value="soft">Soft</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Text Outline
            </label>
            <select
              value={theme.textOutline}
              onChange={(event) =>
                update(
                  "textOutline",
                  event.target.value as ScriptureTextOutline,
                )
              }
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"
            >
              <option value="none">None</option>
              <option value="thin">Thin</option>
              <option value="medium">Medium</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Text Color
            </label>
            <input
              type="color"
              value={theme.textColor}
              onChange={(event) => update("textColor", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-1"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Background
            </label>
            <input
              type="color"
              value={theme.backgroundColor}
              onChange={(event) =>
                update("backgroundColor", event.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-1"
            />
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
          <span className="text-sm text-slate-200">Show Reference Footer</span>
          <input
            type="checkbox"
            checked={theme.showReference}
            onChange={(event) => update("showReference", event.target.checked)}
            className="h-4 w-4"
          />
        </label>
      </div>
    </section>
  );
}