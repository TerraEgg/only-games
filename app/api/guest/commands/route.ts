import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * SSE endpoint for guest users.
 * Uses fingerprint query param to identify the guest session,
 * then polls for AdminCommands targeted at that guest session ID
 * or broadcast commands (targetId = null).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fp = searchParams.get("fp");

  if (!fp) {
    return new Response("Missing fingerprint", { status: 400 });
  }

  // Look up the guest session to get its ID
  const guest = await prisma.guestSession.findUnique({
    where: { fingerprint: fp },
  });

  if (!guest) {
    return new Response("Guest not found", { status: 404 });
  }

  const guestId = guest.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let alive = true;
      let tickCount = 0;

      // Send initial paused state if applicable
      if (guest.isPaused) {
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
          // Update lastSeen every ~30s so admin sees "Online"
          tickCount++;
          if (tickCount % 15 === 1) {
            await prisma.guestSession.update({
              where: { id: guestId },
              data: { lastSeen: new Date() },
            }).catch(() => {});
          }

          // Get unconsumed commands for this guest or broadcast
          const cmds = await prisma.adminCommand.findMany({
            where: {
              consumed: false,
              OR: [{ targetId: guestId }, { targetId: null }],
            },
            orderBy: { createdAt: "asc" },
            take: 20,
          });

          for (const cmd of cmds) {
            // Skip message commands for guests (they don't have accounts)
            if (cmd.type === "message" || cmd.type === "ban" || cmd.type === "unban") continue;

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

          // heartbeat
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
        try {
          controller.close();
        } catch {}
      };

      // Auto-close after 5 minutes
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
