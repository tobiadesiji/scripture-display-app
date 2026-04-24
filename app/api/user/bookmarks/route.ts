import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import {
  createBookmark,
  deleteBookmark,
  getUserBookmarks,
  updateBookmarkLabel,
} from "@/lib/bookmarks";
import type { BibleVersion } from "@/types/scripture";

type BookmarkBody = {
  bookmarkId?: string;
  reference?: string;
  version?: BibleVersion | string | null;
  label?: string | null;
};

export async function GET() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookmarks = await getUserBookmarks(session.user.id);

  return NextResponse.json({
    ok: true,
    bookmarks,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as BookmarkBody;

  if (!body.reference?.trim()) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const bookmark = await createBookmark(
    session.user.id,
    body.reference,
    body.version,
    body.label,
  );

  return NextResponse.json({
    ok: true,
    bookmark,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as BookmarkBody;

  if (!body.bookmarkId?.trim()) {
    return NextResponse.json({ error: "Missing bookmarkId" }, { status: 400 });
  }

  await updateBookmarkLabel(session.user.id, body.bookmarkId, body.label);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as BookmarkBody;

  if (!body.bookmarkId?.trim()) {
    return NextResponse.json({ error: "Missing bookmarkId" }, { status: 400 });
  }

  await deleteBookmark(session.user.id, body.bookmarkId);

  return NextResponse.json({ ok: true });
}