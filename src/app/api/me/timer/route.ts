import { getTimerState } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await getTimerState(user.id), { headers: { "Cache-Control": "no-store" } });
}
