import { getBrowserSession, listSessionMessages } from "@/lib/api";
import { logServerError, logServerEvent } from "@/lib/server-log";
import type { AgentId, SessionStreamEvent } from "@/lib/types";

export const runtime = "nodejs";

const TERMINAL_STATUSES = new Set(["idle", "stopped", "timed_out", "error"]);

function encodeSse(payload: SessionStreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const browserSessionId = searchParams.get("browserSessionId")?.trim();
  const agentId = searchParams.get("agentId")?.trim() as AgentId | null;

  if (!id) {
    return new Response("Missing app session id", { status: 400 });
  }

  if (!browserSessionId || !agentId) {
    return new Response("Missing browserSessionId or agentId", { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const seenMessageIds = new Set<string>();
      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      request.signal.addEventListener("abort", close);

      const write = (payload: SessionStreamEvent) => {
        if (closed) return;
        controller.enqueue(encodeSse(payload));
      };

      void (async () => {
        try {
          while (!closed) {
            try {
              const messages = await listSessionMessages(browserSessionId, { limit: 200 });
              for (const message of messages) {
                if (seenMessageIds.has(message.id)) continue;
                seenMessageIds.add(message.id);
                write({
                  type: "message",
                  agentId,
                  message,
                });
              }
            } catch (err) {
              logServerError("session_stream_messages_failed", err, {
                appSessionId: id,
                browserSessionId,
                agentId,
              });
              write({
                type: "error",
                agentId,
                message: "Failed to load Browser Use activity.",
              });
            }

            const session = await getBrowserSession(browserSessionId);
            if (TERMINAL_STATUSES.has(session.status)) {
              write({
                type: "terminal",
                agentId,
                status: session.status,
              });
              logServerEvent("session_stream_terminal", {
                appSessionId: id,
                browserSessionId,
                agentId,
                status: session.status,
              });
              break;
            }

            await sleep(1000);
          }
        } catch (err) {
          logServerError("session_stream_failed", err, {
            appSessionId: id,
            browserSessionId,
            agentId,
          });
          write({
            type: "error",
            agentId,
            message: err instanceof Error ? err.message : "Session activity stream failed.",
          });
        } finally {
          close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
