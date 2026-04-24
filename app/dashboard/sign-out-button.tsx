"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}