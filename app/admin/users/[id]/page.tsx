import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { isAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import AdminUserEditor from "./user-editor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserPage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!await isAdminUser(session.user.email)) {
    redirect("/");
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
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

  if (!user) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">
                Admin
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Manage User
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Update account details, reset password, and manage this user
                safely.
              </p>
            </div>

            <Link
              href="/admin/users"
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Back to Users
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Name
              </p>
              <p className="mt-2 text-sm font-medium text-white">{user.name}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Email
              </p>
              <p className="mt-2 break-all text-sm font-medium text-white">
                {user.email}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Role
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {user.role || "user"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Verified
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {user.emailVerified ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>

        <AdminUserEditor
          user={{
            ...user,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          }}
          adminEmail={session.user.email}
        />
      </div>
    </main>
  );
}