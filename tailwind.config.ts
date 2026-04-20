import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  // THE FIX: Explicitly tell Tailwind to keep these classes in the CSS bundle
  safelist: [
    'bg-emerald-600',
    'border-emerald-600',
    'hover:bg-emerald-500',
    'text-emerald-500',
    'ring-emerald-500/20'
  ],
  theme: {
    extend: {}
  },
  plugins: []
} satisfies Config;