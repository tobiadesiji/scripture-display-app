import { NextResponse } from "next/server";
import {
  getPresentationSnapshot,
  publishPresentationCommand,
  updatePresentationState,
  updatePresentationViewport,
  type OutputViewport,
  type PresentationCommand,
} from "@/lib/server/presentationHub";
import type { OutputState } from "@/types/scripture";

export const runtime = "nodejs";

type Body = {
  sessionId?: string;
  state?: OutputState;
  viewport?: OutputViewport;
  command?: PresentationCommand;
};

function getSessionIdFromUrl(request: Request) {
  const url = new URL(request.url);
  return (url.searchParams.get("sessionId") ?? "main").trim() || "main";
}

export async function GET(request: Request) {
  const sessionId = getSessionIdFromUrl(request);

  return NextResponse.json(getPresentationSnapshot(sessionId));
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const sessionId = (body.sessionId ?? "main").trim() || "main";

  if (body.state) {
    updatePresentationState(sessionId, body.state);
  }

  if (body.viewport) {
    updatePresentationViewport(sessionId, body.viewport);
  }

  if (body.command) {
    publishPresentationCommand(sessionId, body.command);
  }

  return NextResponse.json({
    ok: true,
    sessionId,
    snapshot: getPresentationSnapshot(sessionId),
  });
}