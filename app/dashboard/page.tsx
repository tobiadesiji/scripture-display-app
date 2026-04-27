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
    <main className="brand-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="brand-card-strong brand-glow-line overflow-hidden p-6 md:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="brand-kicker">WordFlow Dashboard</p>
              <h1 className="brand-heading mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Open the controller for scripture projection, launch the display window,
                or manage admin tools from one branded workspace.
              </p>

              <div className="mt-5 inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm text-slate-300">
                <span className="truncate">Signed in as {session.user.email}</span>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/" className="brand-primary-button">
                  Open Controller
                </Link>
                <Link href="/display" className="brand-secondary-button">
                  Open Display
                </Link>
                <Link href="/admin" className="brand-secondary-button border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                  Open Admin
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="brand-panel p-5">
                <p className="text-3xl font-black text-white">Live</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Controller and display stay linked by session key.
                </p>
              </div>
              <div className="brand-panel p-5">
                <p className="text-3xl font-black text-white">QR</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Mobile remote can join without interrupting the operator.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="brand-card p-6">
            <p className="brand-kicker">Controller</p>
            <h2 className="mt-3 text-xl font-bold text-white">Main workflow</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Search references, preview pages, send scripture, and manage announcements.
            </p>
          </div>

          <div className="brand-card p-6">
            <p className="brand-kicker">Saved content</p>
            <h2 className="mt-3 text-xl font-bold text-white">History & bookmarks</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              History, bookmarked references, free-text information, and display settings stay tied to the account.
            </p>
          </div>

          <div className="brand-card p-6">
            <p className="brand-kicker">Admin</p>
            <h2 className="mt-3 text-xl font-bold text-white">Next expansion</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              User management, password reset workflows, and reporting tools can use the same visual system.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
