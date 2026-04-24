"use client";

import { useState } from "react";

export default function SessionDisplayLinkButton({
  sessionId,
}: {
  sessionId: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={isLoading}
      className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-900 disabled:opacity-60"
      onClick={async () => {
        try {
          setIsLoading(true);

          const response = await fetch("/api/presentation/display-link", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionId }),
          });

          const data = await response.json();

          if (!response.ok || !data.token) {
            alert(data.error || "Failed to create display link.");
            return;
          }

          const url = `${window.location.origin}/display/${data.token}`;
          window.open(url, "_blank", "noopener,noreferrer");
        } catch (error) {
          console.error(error);
          alert("Failed to create display link.");
        } finally {
          setIsLoading(false);
        }
      }}
    >
      {isLoading ? "Creating link..." : "Secure display"}
    </button>
  );
}