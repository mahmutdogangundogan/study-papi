import type { NextRequest } from "next/server";
import { canViewRoom, getRoomForUser, getRoomMessages } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";

// Son mesajlar; ?before=ID verilirse o mesajdan öncekiler ("Önceki mesajlar" düğmesi)
export async function GET(req: NextRequest, ctx: RouteContext<"/api/rooms/[id]/messages">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const room = await getRoomForUser(id, user.id);
  if (!canViewRoom(room)) return Response.json({ error: "not_found" }, { status: 404 });

  const before = Number(req.nextUrl.searchParams.get("before"));
  const page = await getRoomMessages(room.id, Number.isSafeInteger(before) && before > 0 ? before : undefined);
  return Response.json(page, { headers: { "Cache-Control": "no-store" } });
}
