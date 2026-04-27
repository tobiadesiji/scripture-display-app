import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-session";
import { isAdminUser } from "@/lib/admin";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteProps) {
  const session = await getServerSession();

  if (!session?.user?.email || !await isAdminUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    email?: string;
  };

  const email = body.email?.trim();
  const name = body.name?.trim();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Another user already uses that email." },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      email,
      ...(name !== undefined ? { name: name || email.split("@")[0] } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    user: updated,
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteProps) {
  const session = await getServerSession();

  if (!session?.user?.email || !await isAdminUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
    },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (target.email.toLowerCase() === session.user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot delete the current admin account." },
      { status: 400 },
    );
  }

  await prisma.user.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}