import {
  getPresentationSnapshot,
  subscribeToPresentationEvents,
  type PresentationEvent,
} from "@/lib/server/presentationHub";

export const runtime = "nodejs";

function serialize(event: PresentationEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function getSessionIdFromUrl(request: Request) {
  const url = new URL(request.url);
  return (url.searchParams.get("sessionId") ?? "main").trim() || "main";
}

export async function GET(request: Request) {
  const sessionId = getSessionIdFromUrl(request);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (event: PresentationEvent) => {
        controller.enqueue(encoder.encode(serialize(event)));
      };

      push({ type: "snapshot", payload: getPresentationSnapshot(sessionId) });

      const unsubscribe = subscribeToPresentationEvents(sessionId, push);

      const heartbeat = setInterval(() => {
        push({ type: "ping", payload: { time: Date.now() } });
      }, 25000);

      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };

      request.signal.addEventListener("abort", close, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}