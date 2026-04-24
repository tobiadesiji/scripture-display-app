import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { isAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const session = await getServerSession();

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    newPassword?: string;
  };

  const newPassword = body.newPassword?.trim();

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    await auth.api.setUserPassword({
      body: {
        userId: id,
        newPassword,
      },
      headers: request.headers,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return NextResponse.json(
      { error: "Failed to reset password." },
      { status: 500 },
    );
  }
}