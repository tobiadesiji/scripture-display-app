import { redirect } from "next/navigation";
import ControlClient from "@/components/control/ControlClient";
import { getServerSession } from "@/lib/auth-session";
import { getUserPreferences } from "@/lib/user-preferences";
import { getRecentReferenceHistory } from "@/lib/reference-history";
import { getUserBookmarks } from "@/lib/bookmarks";
import { isAdminEmail } from "@/lib/admin";
import type { BibleVersion, ThemeSettings } from "@/types/scripture";

export default async function HomePage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [preferences, history, bookmarks] = await Promise.all([
    getUserPreferences(session.user.id),
    getRecentReferenceHistory(session.user.id, 20),
    getUserBookmarks(session.user.id),
  ]);

  const preferredVersion =
    (preferences?.preferredVersion as BibleVersion | null | undefined) || "KJV";

  const savedTheme =
    (preferences?.themeSettingsJson as ThemeSettings | null | undefined) || null;

  return (
    <ControlClient
      userId={session.user.id}
      userEmail={session.user.email || ""}
      userName={session.user.name || ""}
      isAdmin={isAdminEmail(session.user.email)}
      initialPreferredVersion={preferredVersion}
      initialTheme={savedTheme || undefined}
      initialHistory={history.map((item) => ({
        id: item.id,
        reference: item.reference,
        version: item.version || "",
        openedAt: item.openedAt.toISOString(),
      }))}
      initialBookmarks={bookmarks.map((item) => ({
        id: item.id,
        reference: item.reference,
        version: item.version || "",
        label: item.label || "",
        createdAt: item.createdAt.toISOString(),
      }))}
    />
  );
}