import type { Metadata } from "next";
import Form from "next/form";
import { joinPublicRoom } from "@/actions/rooms";
import { RoomCard } from "@/components/room-card";
import { inputClass } from "@/components/ui/form";
import { searchPublicRooms } from "@/lib/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Keşfet" };

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const user = await requireUser("/explore");
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const rooms = await searchPublicRooms(user.id, query);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Public odalar</h1>
        <p className="mt-1 text-sm text-zinc-400">Private odalara sadece davet linki ya da kodla girilebilir.</p>
      </div>

      <Form action="/explore" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Oda ara…"
          aria-label="Oda ara"
          className={inputClass}
        />
        <button type="submit" className="h-12 shrink-0 rounded-xl bg-white/10 px-5 font-medium text-white">
          Ara
        </button>
      </Form>

      {rooms.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-400">
          {query ? `“${query}” ile eşleşen public oda yok.` : "Henüz public oda yok. İlkini sen aç!"}
        </p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              {...room}
              action={
                room.isMember ? (
                  <span className="text-xs font-medium text-zinc-500">Üyesin</span>
                ) : (
                  <form action={joinPublicRoom.bind(null, room.id)}>
                    <button
                      type="submit"
                      className="h-9 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 active:scale-[0.97]"
                    >
                      Katıl
                    </button>
                  </form>
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
