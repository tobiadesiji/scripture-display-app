import { NextRequest, NextResponse } from "next/server";
import {
  getPresentationSnapshot,
  updatePresentationSnapshot,
} from "@/lib/server/presentationHub";
import type { OutputState } from "@/types/scripture";
import type { OutputViewport, PresentationCommand } from "@/lib/syncOutput";

type Body = {
  sessionId?: string;
  state?: OutputState;
  viewport?: OutputViewport;
  command?: PresentationCommand;
  presence?: boolean;
};

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const snapshot = getPresentationSnapshot(sessionId);

  return NextResponse.json(
    snapshot ?? {
      state: null,
      viewport: null,
      lastCommand: null,
      updatedAt: Date.now(),
      presenceTs: null,
    },
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Body;
  const sessionId = body.sessionId?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const snapshot = updatePresentationSnapshot(sessionId, {
    state: body.state,
    viewport: body.viewport,
    command: body.command,
    presence: body.presence,
  });

  return NextResponse.json({
    ok: true,
    snapshot,
  });
}