import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { isAdminUser } from "@/lib/admin";

export default async function AdminHistoryPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!await isAdminUser(session.user.email)) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold">Admin History</h1>
        <p className="mt-2 text-sm text-slate-400">
          Admin reference history view coming soon.
        </p>
      </div>
    </main>
  );
}