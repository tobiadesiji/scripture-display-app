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
    <main className="brand-shell flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl">
        <div className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 shadow-[0_30px_100px_rgba(2,6,23,0.58)] backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-md">
              <Link href="/" className="brand-pill mb-8 w-fit">
                WordFlow Controller
              </Link>

              <h1 className="text-3xl font-black tracking-tight text-white">
                Create account
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Keep your reference history, bookmarks, and display settings synced to your account.
              </p>

              <form
                className="mt-8 space-y-5"
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
                  <label className="brand-label">Name</label>
                  <input
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="brand-input"
                    required
                  />
                </div>

                <div>
                  <label className="brand-label">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="brand-input"
                    required
                  />
                </div>

                <div>
                  <label className="brand-label">Password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="brand-input"
                    minLength={8}
                    required
                  />
                  <p className="mt-2 text-xs text-slate-500">Minimum 8 characters.</p>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="brand-primary-button w-full"
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
              </form>

              <p className="mt-7 text-sm text-slate-400">
                Already have an account? {" "}
                <Link href="/login" className="font-semibold text-emerald-200 underline decoration-emerald-300/40 underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>
          </section>

          <section className="relative hidden min-h-[640px] overflow-hidden p-10 lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/12 via-emerald-400/10 to-violet-400/12" />
            <div className="absolute -left-20 bottom-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="absolute -right-28 top-16 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-2xl font-black text-cyan-100">
                  ✦
                </div>
                <p className="brand-kicker mt-8">Designed for worship teams</p>
                <h2 className="brand-heading mt-4 max-w-md text-5xl font-black tracking-tight">
                  Fast scripture lookup, polished live output.
                </h2>
                <p className="mt-5 max-w-md text-base leading-8 text-slate-300">
                  Build a consistent church media workflow using WordFlow.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                <div className="brand-panel p-4">
                  <p className="text-2xl font-black text-white">QR</p>
                  <p className="mt-1 text-xs text-slate-400">Remote ready</p>
                </div>
                <div className="brand-panel p-4">
                  <p className="text-2xl font-black text-white">Live</p>
                  <p className="mt-1 text-xs text-slate-400">Display sync</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
