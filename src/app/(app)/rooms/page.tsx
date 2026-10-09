import type { Metadata } from "next";
import Link from "next/link";
import { RoomCard } from "@/components/room-card";
import { JoinByCodeForm } from "@/components/room-forms";
import { getMyRooms } from "@/lib/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Odalarım" };

export default async function RoomsPage() {
  const user = await requireUser("/rooms");
  const rooms = await getMyRooms(user.id);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-zinc-400">Selam, {user.displayName} 👋</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-white">Odalarım</h1>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-300">Kodla ya da davet linkiyle katıl</h2>
        <JoinByCodeForm />
      </section>

      <section>
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <p className="font-medium text-white">Henüz bir odada değilsin</p>
            <p className="mt-1 text-sm text-zinc-400">Yeni bir oda aç ya da public odalara göz at.</p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Link href="/rooms/new" className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-emerald-950">
                Oda aç
              </Link>
              <Link href="/explore" className="rounded-xl px-5 py-3 font-medium text-white ring-1 ring-white/10">
                Public odaları keşfet
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                {...room}
                badge={room.role === "owner" ? "Sahip" : room.visibility === "private" ? "Private" : undefined}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
