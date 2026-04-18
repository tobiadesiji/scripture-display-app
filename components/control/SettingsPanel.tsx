"use client";

import { useState } from "react";
import type { ThemeSettings } from "@/types/scripture";

type Props = {
  theme: ThemeSettings;
  onThemeChange: (value: ThemeSettings) => void;
};

export default function SettingsPanel({ theme, onThemeChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <p className="mt-1 text-sm text-slate-400">
            {isOpen ? "Hide settings" : "Show settings"}
          </p>
        </div>

        <span className="text-sm text-slate-300">{isOpen ? "▾" : "▸"}</span>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-800 p-5">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Display Theme
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Font size</span>
                  <input
                    type="range"
                    min="28"
                    max="96"
                    step="2"
                    value={theme.fontSize}
                    onChange={(event) =>
                      onThemeChange({ ...theme, fontSize: Number(event.target.value) })
                    }
                    className="w-full"
                  />
                  <span className="mt-1 block text-xs text-slate-400">
                    {theme.fontSize}px
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Line height</span>
                  <input
                    type="range"
                    min="1.1"
                    max="2"
                    step="0.05"
                    value={theme.lineHeight}
                    onChange={(event) =>
                      onThemeChange({ ...theme, lineHeight: Number(event.target.value) })
                    }
                    className="w-full"
                  />
                  <span className="mt-1 block text-xs text-slate-400">
                    {theme.lineHeight}
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Text color</span>
                  <input
                    type="color"
                    value={theme.textColor}
                    onChange={(event) =>
                      onThemeChange({ ...theme, textColor: event.target.value })
                    }
                    className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 p-1"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Background color</span>
                  <input
                    type="color"
                    value={theme.backgroundColor}
                    onChange={(event) =>
                      onThemeChange({ ...theme, backgroundColor: event.target.value })
                    }
                    className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 p-1"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Text alignment</span>
                  <select
                    value={theme.textAlign}
                    onChange={(event) =>
                      onThemeChange({
                        ...theme,
                        textAlign: event.target.value as ThemeSettings["textAlign"]
                      })
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
                    checked={theme.showReference}
                    onChange={(event) =>
                      onThemeChange({ ...theme, showReference: event.target.checked })
                    }
                  />
                  <span className="text-sm text-slate-300">Show reference footer</span>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Future Shortcuts / Layout Options
              </h3>

              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm text-slate-400">
                Reserved for keyboard shortcuts, layout presets, fullscreen options, and
                presentation preferences.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}