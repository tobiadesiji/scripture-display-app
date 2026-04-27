import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

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
      role: true,
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">
                Admin
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Manage Users
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Create new accounts, edit users, reset passwords, and remove users.
              </p>
            </div>

            <Link
              href="/admin"
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        <AdminCreateUserCard />

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Registered Users</h2>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-950/60">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="bg-slate-900">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">
                      {user.role || "user"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">
                      {user.emailVerified ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-400">
                No users found.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function AdminCreateUserCard() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">Create New Account</h2>
      <p className="mt-2 text-sm text-slate-400">
        Use the button below to open the inline create form.
      </p>

      <form
        action="/admin/users/new"
        className="mt-5"
      >
        <Link
          href="/admin/users/new"
          className="inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
        >
          Create User
        </Link>
      </form>
    </div>
  );
}