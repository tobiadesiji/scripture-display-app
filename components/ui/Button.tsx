"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  controlTheme?: "dark" | "light";
};

export default function Button({
  children,
  className = "",
  controlTheme = "dark",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

  const themeClass =
    controlTheme === "light"
      ? "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
      : "border border-slate-700 bg-slate-900 text-white hover:bg-slate-800";

  return (
    <button
      {...props}
      disabled={disabled}
      className={`${base} ${themeClass} ${className}`}
    >
      {children}
    </button>
  );
}