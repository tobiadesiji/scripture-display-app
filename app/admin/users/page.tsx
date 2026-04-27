import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import { isAdminUser } from "@/lib/admin";

export default async function AdminUsersPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!await isAdminUser(session.user.email)) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Registered Users
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {users.length} total user{users.length === 1 ? "" : "s"}
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Back
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-800 bg-slate-950/50">
                <tr className="text-left text-sm text-slate-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Verified</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-800 text-sm last:border-b-0"
                  >
                    <td className="px-4 py-4 text-white">
                      {user.name || "No name"}
                    </td>
                    <td className="px-4 py-4 text-slate-300">{user.email}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          user.emailVerified
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}

                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-slate-400"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}