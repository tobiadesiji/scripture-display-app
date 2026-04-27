"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="brand-shell flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl">
        <div className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 shadow-[0_30px_100px_rgba(2,6,23,0.58)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[620px] overflow-hidden p-10 lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/12 via-cyan-400/10 to-violet-400/12" />
            <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-2xl font-black text-emerald-200">
                  WF
                </div>
                <p className="brand-kicker mt-8">WordFlow</p>
                <h1 className="brand-heading mt-4 max-w-md text-5xl font-black tracking-tight">
                  Scripture projection with a calmer control room.
                </h1>
                <p className="mt-5 max-w-md text-base leading-8 text-slate-300">
                  Sign in to manage your scripture controller, bookmarks, reference history and live presentation sessions.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-slate-300">
                <div className="brand-panel flex items-center justify-between px-4 py-3">
                  <span>Live display session</span>
                  <span className="text-emerald-200">Ready</span>
                </div>
                <div className="brand-panel flex items-center justify-between px-4 py-3">
                  <span>Remote control QR</span>
                  <span className="text-cyan-200">Included</span>
                </div>
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-md">
              <Link href="/" className="brand-pill mb-8 w-fit">
                WordFlow Controller
              </Link>

              <h2 className="text-3xl font-black tracking-tight text-white">
                Welcome back
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Access your scripture controller, saved history, bookmarks, and display settings.
              </p>

              <form
                className="mt-8 space-y-5"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setError("");
                  setIsSubmitting(true);

                  try {
                    const result = await authClient.signIn.email({
                      email,
                      password,
                      callbackURL: "/",
                    });

                    setIsSubmitting(false);

                    if (result.error) {
                      setError(result.error.message || "Unable to sign in.");
                      return;
                    }

                    router.push("/");
                    router.refresh();
                  } catch (err) {
                    setIsSubmitting(false);
                    setError(err instanceof Error ? err.message : "Unable to sign in.");
                  }
                }}
              >
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="brand-input"
                    required
                  />
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
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <p className="mt-7 text-sm text-slate-400">
                Don&apos;t have an account? {" "}
                <Link href="/register" className="font-semibold text-emerald-200 underline decoration-emerald-300/40 underline-offset-4">
                  Create one
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
