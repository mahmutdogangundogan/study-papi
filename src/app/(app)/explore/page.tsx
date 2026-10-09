import type { Metadata } from "next";
import Form from "next/form";
import { joinPublicRoom } from "@/actions/rooms";
import { RoomRow } from "@/components/room-card";
import { searchPublicRooms } from "@/lib/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Keşfet" };

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const user = await requireUser("/explore");
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const rooms = await searchPublicRooms(user.id, query);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-[30px] leading-tight font-bold">Herkese açık odalar</h1>
        <p className="mt-1.5 text-ink-muted">Çalışanı en çok olan oda en üstte. Özel odalar burada listelenmez.</p>
      </header>

      <Form action="/explore" className="flex items-end gap-3">
        <label className="flex-1">
          <span className="block text-[13px] font-medium text-ink-muted">Oda adı</span>
          <input type="search" name="q" defaultValue={query} placeholder="Örneğin: KPSS" className="field" />
        </label>
        <button type="submit" className="btn-secondary btn-sm mb-1">
          Ara
        </button>
      </Form>

      {rooms.length === 0 ? (
        <p className="border-y border-rule py-8 font-serif text-[17px] text-ink-muted italic">
          {query ? `“${query}” adında herkese açık bir oda yok.` : "Henüz herkese açık oda yok. İlkini sen açabilirsin."}
        </p>
      ) : (
        <ul className="ledger -mx-4 sm:mx-0">
          {rooms.map((room) => (
            <RoomRow
              key={room.id}
              {...room}
              action={
                room.isMember ? (
                  <span className="text-[13px] text-ink-muted">Üyesin</span>
                ) : (
                  <form action={joinPublicRoom.bind(null, room.id)}>
                    <button type="submit" className="btn-primary btn-sm">
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
