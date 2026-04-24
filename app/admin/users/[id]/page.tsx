import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import { isAdminEmail } from "@/lib/admin";
import AdminUserEditor from "./user-editor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!isAdminEmail(session.user.email)) {
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
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Manage User
          </h1>
          <p className="mt-3 text-sm text-slate-400">{user.email}</p>
        </div>

        <AdminUserEditor
          user={{
            id: user.id,
            name: user.name ?? "",
            email: user.email,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          }}
          adminEmail={session.user.email}
        />
      </div>
    </main>
  );
}