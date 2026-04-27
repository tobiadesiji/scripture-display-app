import { prisma } from "@/lib/prisma";

export async function isAdminUser(email?: string | null) {
  if (!email) return false;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { role: true },
  });

  return user?.role === "admin";
}