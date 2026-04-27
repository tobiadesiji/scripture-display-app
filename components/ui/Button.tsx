"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  controlTheme?: "dark" | "light";
  variant?: ButtonVariant;
};

export default function Button({
  children,
  className = "",
  controlTheme = "dark",
  variant = "secondary",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";

  const darkVariants: Record<ButtonVariant, string> = {
    primary:
      "border border-emerald-300/30 bg-gradient-to-r from-emerald-300 to-cyan-300 text-slate-950 shadow-[0_18px_48px_rgba(16,185,129,0.22)] hover:brightness-110 focus:ring-emerald-300/20",
    secondary:
      "border border-white/10 bg-white/[0.055] text-white hover:border-white/20 hover:bg-white/[0.085] focus:ring-cyan-300/10",
    danger:
      "border border-red-400/25 bg-red-500/10 text-red-100 hover:bg-red-500/15 focus:ring-red-400/10",
    ghost:
      "border border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white focus:ring-slate-300/10",
  };

  const lightVariants: Record<ButtonVariant, string> = {
    primary:
      "border border-emerald-500/20 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-[0_14px_36px_rgba(16,185,129,0.22)] hover:brightness-105 focus:ring-emerald-300/30",
    secondary:
      "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-300/30",
    danger:
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-200/40",
    ghost:
      "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus:ring-slate-300/30",
  };

  const themeClass =
    controlTheme === "light" ? lightVariants[variant] : darkVariants[variant];

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
