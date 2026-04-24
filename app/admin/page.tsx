import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { isAdminEmail } from "@/lib/admin";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!isAdminEmail(session.user.email)) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Manage registered users. More admin tools can be added here later.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/users"
            className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700 hover:bg-slate-900/80"
          >
            <h2 className="text-xl font-semibold">Users</h2>
            <p className="mt-2 text-sm text-slate-400">
              View, edit, and delete registered users.
            </p>
          </Link>

          <Link
            href="/"
            className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700 hover:bg-slate-900/80"
          >
            <h2 className="text-xl font-semibold">Back to Controller</h2>
            <p className="mt-2 text-sm text-slate-400">
              Return to the main scripture controller.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}