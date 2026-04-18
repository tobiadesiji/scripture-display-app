import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Scripture Web App",
  description: "Browser-based scripture projection app"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
