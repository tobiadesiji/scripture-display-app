import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "WordFlow | WorshipFlow",
  description:
    "A scripture display and remote Bible presentation app for churches and worship teams.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
