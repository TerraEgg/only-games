import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * SSE stream that pushes new chat messages to connected clients.
 * Supports ?roomId= param (omit or empty for global).
 * Polls the DB every 2 seconds for new messages since the last seen ID.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId") || null;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let alive = true;
      let lastId: string | null = null;

      // Get the latest message id in this room to start from
      const latest = await prisma.chatMessage.findFirst({
        where: { roomId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (latest) lastId = latest.id;

      async function tick() {
        if (!alive) return;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const where: any = { roomId };
          if (lastId) {
            const lastMsg = await prisma.chatMessage.findUnique({
              where: { id: lastId },
              select: { createdAt: true },
            });
            if (lastMsg) {
              where.createdAt = { gt: lastMsg.createdAt };
            }
          }

          const newMsgs = await prisma.chatMessage.findMany({
            where,
            orderBy: { createdAt: "asc" },
            take: 50,
            select: {
              id: true,
              content: true,
              createdAt: true,
              roomId: true,
              user: { select: { id: true, username: true, role: true } },
            },
          });

          for (const msg of newMsgs) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(msg)}\n\n`)
            );
            lastId = msg.id;
          }

          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          alive = false;
        }
      }

      const interval = setInterval(tick, 2000);
      tick();

      const cleanup = () => {
        alive = false;
        clearInterval(interval);
        try { controller.close(); } catch {}
      };

      setTimeout(cleanup, 5 * 60 * 1000);
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
