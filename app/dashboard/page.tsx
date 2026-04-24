import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const firstName =
    session.user.name?.trim()?.split(/\s+/)[0] ||
    session.user.email?.split("@")[0] ||
    "there";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.28)] md:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">
            Dashboard
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            The main user workflow now lives in the Controller. Use this page as a
            simple access point while the admin area is being expanded.
          </p>

          <div className="mt-4 inline-flex items-center rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-slate-300">
            Signed in as {session.user.email}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
            >
              Open Controller
            </Link>

            <Link
              href="/display"
              className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Open Display
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-300 transition hover:bg-blue-500/15"
            >
              Open Admin
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
            <h2 className="text-xl font-semibold">Current structure</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>• Login and registration route users directly into the Controller.</p>
              <p>• History, bookmarks, and display settings are tied to the user account.</p>
              <p>• Display output still follows the current session-key popup flow.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
            <h2 className="text-xl font-semibold">Next admin steps</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>• User management</p>
              <p>• Password reset workflows</p>
              <p>• Reference history review</p>
              <p>• Admin-only reporting tools</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}