import "dotenv/config";
import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const adminName = process.env.ADMIN_NAME?.trim() || "Admin";
  const adminForceSync =
    process.env.ADMIN_FORCE_SYNC?.trim().toLowerCase() === "true";

  if (!adminEmail || !adminPassword) {
    console.log("Admin sync skipped: ADMIN_EMAIL or ADMIN_PASSWORD missing.");
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!existingUser) {
    console.log(`Creating bootstrap admin user: ${adminEmail}`);

    await auth.api.createUser({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: "admin",
      },
    });

    console.log("Bootstrap admin created.");
    return;
  }

  if (existingUser.role !== "admin" || existingUser.name !== adminName) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: "admin",
        name: adminName,
      },
    });

    console.log("Existing admin user role/name synced.");
  }

  if (adminForceSync) {
    console.log("ADMIN_FORCE_SYNC=true, updating admin password.");

    await auth.api.setUserPassword({
      body: {
        userId: existingUser.id,
        newPassword: adminPassword,
      },
    });

    console.log("Admin password synced from environment.");
  } else {
    console.log(
      "Admin password sync skipped. Set ADMIN_FORCE_SYNC=true to force password update.",
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Admin sync failed:", error);
    await prisma.$disconnect();
    process.exit(0);
  });