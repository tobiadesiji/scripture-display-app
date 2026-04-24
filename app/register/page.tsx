"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create an account to keep your reference history, bookmarks, and display settings.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setIsSubmitting(true);

            try {
              const result = await authClient.signUp.email({
                name,
                email,
                password,
                callbackURL: "/",
              });

              setIsSubmitting(false);

              if (result.error) {
                setError(result.error.message || "Unable to create account.");
                return;
              }

              router.push("/");
              router.refresh();
            } catch (err) {
              setIsSubmitting(false);
              setError(err instanceof Error ? err.message : "Unable to create account.");
            }
          }}
        >
          <div>
            <label className="mb-2 block text-sm text-slate-300">Name</label>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-slate-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-slate-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-slate-500"
              minLength={8}
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-200 disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-white underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}