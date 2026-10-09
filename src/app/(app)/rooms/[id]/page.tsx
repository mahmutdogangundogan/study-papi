import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteRoom, joinPublicRoom, leaveRoom, regenerateRoomCode } from "@/actions/rooms";
import { InvitePanel } from "@/components/invite-panel";
import { RoomLive } from "@/components/room-live";
import { TimerCard } from "@/components/timer-ui";
import { primaryButtonClass } from "@/components/ui/form";
import { getRoomForUser, getRoomMembersLive } from "@/lib/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Oda" };

export default async function RoomPage({ params }: PageProps<"/rooms/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/rooms/${id}`);
  const room = await getRoomForUser(id, user.id);

  // Private odanın varlığını bile üye olmayanlara belli etme
  if (!room || (!room.role && room.visibility !== "public")) notFound();

  const live = await getRoomMembersLive(room.id);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-white">{room.name}</h1>
          <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400 ring-1 ring-white/10">
            {room.visibility === "public" ? "Public" : "Private"}
          </span>
        </div>
        {room.description && <p className="mt-1 text-sm text-zinc-400">{room.description}</p>}
      </div>

      {room.role ? (
        <TimerCard />
      ) : (
        <section className="rounded-3xl bg-white/[0.03] p-6 text-center ring-1 ring-white/10">
          <p className="font-medium text-white">Bu odanın üyesi değilsin</p>
          <p className="mt-1 text-sm text-zinc-400">Katıl, çalışırken odadakiler seni görsün.</p>
          <form action={joinPublicRoom.bind(null, room.id)} className="mt-5">
            <button type="submit" className={primaryButtonClass}>
              Odaya katıl
            </button>
          </form>
        </section>
      )}

      <RoomLive roomId={room.id} meId={user.id} initial={live} />

      {room.role && <InvitePanel code={room.code} roomName={room.name} />}

      {room.role === "owner" && (
        <details className="group rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-300">
            Oda ayarları <span className="text-zinc-500 group-open:hidden">›</span>
          </summary>
          <div className="space-y-3 border-t border-white/5 p-4">
            <form action={regenerateRoomCode.bind(null, room.id)}>
              <button type="submit" className="h-11 w-full rounded-xl bg-white/5 text-sm font-medium text-white ring-1 ring-white/10">
                Davet kodunu yenile
              </button>
              <p className="mt-1.5 text-xs text-zinc-500">Eski kod ve link çalışmaz olur; mevcut üyeler odada kalır.</p>
            </form>
            <details>
              <summary className="cursor-pointer list-none text-sm font-medium text-red-400">Odayı sil…</summary>
              <form action={deleteRoom.bind(null, room.id)} className="mt-2">
                <button type="submit" className="h-11 w-full rounded-xl bg-red-500/15 text-sm font-semibold text-red-300 ring-1 ring-red-400/30">
                  Evet, “{room.name}” odasını kalıcı olarak sil
                </button>
              </form>
            </details>
          </div>
        </details>
      )}

      {room.role === "member" && (
        <form action={leaveRoom.bind(null, room.id)} className="text-center">
          <button type="submit" className="text-sm text-zinc-500 underline-offset-4 hover:text-red-300 hover:underline">
            Odadan ayrıl
          </button>
        </form>
      )}
    </div>
  );
}
