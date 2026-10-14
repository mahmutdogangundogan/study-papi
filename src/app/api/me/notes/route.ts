import { z } from "zod";
import { getNotes, NOTES_MAX_LENGTH, saveNotes } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";

// Kişisel notlar. Kayıt Server Action yerine burada: sayfa kapanırken de gönderilebilsin (fetch keepalive)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await getNotes(user.id), { headers: { "Cache-Control": "no-store" } });
}

const saveSchema = z.object({
  body: z.string().max(NOTES_MAX_LENGTH),
  version: z.number().int().min(0),
});

export async function PUT(req: Request) {
  // Server Action'ların yaptığı gibi: başka bir site ziyaretçinin çereziyle yazamasın
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !URL.canParse(origin) || new URL(origin).host !== host) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });

  const result = await saveNotes(user.id, parsed.data.body, parsed.data.version);
  return Response.json(result, { status: result.conflict ? 409 : 200 });
}
