import { getRoomForUser, getRoomMembersLive } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";

export async function GET(_req: Request, ctx: RouteContext<"/api/rooms/[id]/live">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const room = await getRoomForUser(id, user.id);
  // Private odaların üye listesini sadece üyeler görebilir
  if (!room || (!room.role && room.visibility !== "public")) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const live = await getRoomMembersLive(room.id);
  return Response.json(live, { headers: { "Cache-Control": "no-store" } });
}
