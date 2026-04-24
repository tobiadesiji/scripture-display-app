import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import {
  addReferenceHistory,
  clearReferenceHistory,
  getRecentReferenceHistory,
  hideReferenceHistoryItem,
} from "@/lib/reference-history";
import type { BibleVersion } from "@/types/scripture";

type HistoryBody = {
  sessionKey?: string | null;
  reference?: string;
  version?: BibleVersion | string | null;
  clear?: boolean;
  historyId?: string;
};

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 12;

  const history = await getRecentReferenceHistory(
    session.user.id,
    Number.isFinite(limit) && limit > 0 ? limit : 12,
  );

  return NextResponse.json({
    ok: true,
    history,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HistoryBody;

  if (!body.reference?.trim()) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const created = await addReferenceHistory(
    session.user.id,
    body.sessionKey,
    body.reference,
    body.version,
  );

  return NextResponse.json({
    ok: true,
    item: created,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HistoryBody;

  if (body.clear) {
    await clearReferenceHistory(session.user.id);
    return NextResponse.json({ ok: true });
  }

  if (body.historyId?.trim()) {
    await hideReferenceHistoryItem(session.user.id, body.historyId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Missing historyId or clear flag" },
    { status: 400 },
  );
}