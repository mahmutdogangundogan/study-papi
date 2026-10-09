import type { Metadata } from "next";
import Link from "next/link";
import { RoomRow } from "@/components/room-card";
import { JoinByCodeForm } from "@/components/room-forms";
import { getMyRooms } from "@/lib/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Odalarım" };

export default async function RoomsPage() {
  const user = await requireUser("/rooms");
  const rooms = await getMyRooms(user.id);

  return (
    <div className="space-y-10">
      <header>
        <p className="font-serif text-[15px] text-ink-muted italic">Selam {user.displayName},</p>
        <h1 className="font-serif text-[30px] leading-tight font-bold">Odaların</h1>
      </header>

      {rooms.length === 0 ? (
        <section className="border-y border-rule py-8">
          <p className="font-serif text-[19px]">Henüz bir masaya oturmadın.</p>
          <p className="mt-1 text-ink-muted">
            Kendi odanı aç ya da herkese açık odalara bak. Arkadaşından kod aldıysan aşağıya yaz.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/rooms/new" className="btn-primary">
              Oda aç
            </Link>
            <Link href="/explore" className="btn-secondary">
              Herkese açık odalar
            </Link>
          </div>
        </section>
      ) : (
        <ul className="ledger -mx-4 sm:mx-0">
          {rooms.map((room) => (
            <RoomRow
              key={room.id}
              {...room}
              stamp={
                room.role === "owner"
                  ? { label: "Senin odan", tone: "accent" }
                  : room.visibility === "private"
                    ? { label: "Özel", tone: "ink" }
                    : undefined
              }
            />
          ))}
        </ul>
      )}

      <section className="sheet px-4 py-5">
        <h2 className="font-serif text-[19px] font-bold">Kodla katıl</h2>
        <p className="mb-4 text-[14px] text-ink-muted">Özel odalara sadece kod ya da davet linkiyle girilir.</p>
        <JoinByCodeForm />
      </section>
    </div>
  );
}
