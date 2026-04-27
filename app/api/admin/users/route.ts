import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { isAdminUser } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user?.email || !(await isAdminUser(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.email || !(await isAdminUser(session.user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const role = body.role === "admin" ? "admin" : "user";

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const user = await auth.api.createUser({
      body: {
        name,
        email,
        password,
        role,
      },
      headers: request.headers,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("Failed to create user:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create user.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}