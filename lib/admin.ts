export function isAdminEmail(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const currentEmail = email?.trim().toLowerCase();

  return Boolean(adminEmail && currentEmail && adminEmail === currentEmail);
}