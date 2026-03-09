import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * SSE endpoint — each connected client polls for admin commands.
 * Streams commands addressed to them (or broadcast) every 2 seconds.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  // Pre-fetch user's pause state so we can push it immediately on connect
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPaused: true },
  });

  const stream = new ReadableStream({
    async start(controller) {
      let alive = true;
      let tickCount = 0;

      // Send initial paused state if applicable
      if (user?.isPaused) {
        const initPayload = JSON.stringify({
          id: "init-pause",
          type: "pause",
          payload: { message: "Your session has been paused by an administrator." },
        });
        controller.enqueue(encoder.encode(`data: ${initPayload}\n\n`));
      }

      async function tick() {
        if (!alive) return;
        try {
          // Update lastLogin every ~30s (every 15th tick at 2s interval) so admin sees "Online"
          tickCount++;
          if (tickCount % 15 === 1) {
            await prisma.user.update({
              where: { id: userId },
              data: { lastLogin: new Date() },
            }).catch(() => {});
          }

          // Get unconsumed commands for this user or broadcast (targetId = null)
          const cmds = await prisma.adminCommand.findMany({
            where: {
              consumed: false,
              OR: [{ targetId: userId }, { targetId: null }],
            },
            orderBy: { createdAt: "asc" },
            take: 20,
          });

          for (const cmd of cmds) {
            const payload = JSON.stringify({
              id: cmd.id,
              type: cmd.type,
              payload: JSON.parse(cmd.payload),
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));

            // Mark targeted ones as consumed; broadcast ones stay for other clients
            if (cmd.targetId) {
              await prisma.adminCommand.update({
                where: { id: cmd.id },
                data: { consumed: true },
              });
            }
          }

          // Check for pending prank redirects
          const prank = await prisma.prankRedirect.findFirst({
            where: { targetId: userId, executed: false },
            orderBy: { createdAt: "asc" },
          });
          if (prank) {
            const prankPayload = JSON.stringify({
              id: `prank-${prank.id}`,
              type: "redirect",
              payload: { url: prank.redirectUrl },
            });
            controller.enqueue(encoder.encode(`data: ${prankPayload}\n\n`));
            await prisma.prankRedirect.update({
              where: { id: prank.id },
              data: { executed: true },
            });
          }

          // heartbeat
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          alive = false;
        }
      }

      // Poll every 2 seconds
      const interval = setInterval(tick, 2000);
      tick(); // immediate first tick

      // Cleanup when client disconnects
      const cleanup = () => {
        alive = false;
        clearInterval(interval);
        try { controller.close(); } catch {}
      };

      // Auto-close after 5 minutes to avoid zombie connections
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
