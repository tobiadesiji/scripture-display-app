import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
    return;
  }

  await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  });

  console.log(`Admin created: ${email}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed admin:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });