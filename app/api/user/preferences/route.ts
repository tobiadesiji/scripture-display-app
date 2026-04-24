import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { getUserPreferences, upsertUserPreferences } from "@/lib/user-preferences";
import type { BibleVersion, ThemeSettings } from "@/types/scripture";

type PreferencesBody = {
  preferredVersion?: BibleVersion | null;
  themeSettingsJson?: ThemeSettings | null;
};

export async function GET() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await getUserPreferences(session.user.id);

  return NextResponse.json({
    ok: true,
    preferences,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as PreferencesBody;

  const saved = await upsertUserPreferences(session.user.id, {
    preferredVersion: body.preferredVersion,
    themeSettingsJson: body.themeSettingsJson,
  });

  return NextResponse.json({
    ok: true,
    preferences: saved,
  });
}