import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteRoom, joinPublicRoom, leaveRoom, regenerateRoomCode } from "@/actions/rooms";
import { InvitePanel } from "@/components/invite-panel";
import { RoomChat } from "@/components/room-chat";
import { RoomChatPanel } from "@/components/room-chat-panel";
import { RoomLive } from "@/components/room-live";
import { TimerDesk } from "@/components/timer-ui";
import { canViewRoom, getRoomForUser, getRoomMembersLive, getRoomMessages } from "@/lib/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Oda" };

export default async function RoomPage({ params }: PageProps<"/rooms/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/rooms/${id}`);
  const room = await getRoomForUser(id, user.id);

  if (!canViewRoom(room)) notFound();

  const [live, chat] = await Promise.all([getRoomMembersLive(room.id), getRoomMessages(room.id)]);

  return (
    <RoomChatPanel chat={<RoomChat roomId={room.id} meId={user.id} canWrite={!!room.role} initial={chat} />}>
      <div className="space-y-12">
        <header>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-serif text-[30px] leading-tight font-bold">{room.name}</h1>
            <span className={`stamp mt-2.5 ${room.visibility === "public" ? "text-accent" : "text-ink-muted"}`}>
              {room.visibility === "public" ? "Herkese açık" : "Özel"}
            </span>
          </div>
          {room.description && <p className="mt-1.5 text-ink-muted">{room.description}</p>}
        </header>

        {room.role ? (
          <TimerDesk />
        ) : (
          <section className="sheet px-5 py-6">
            <p className="font-serif text-[19px] font-bold">Bu masada yerin yok, henüz.</p>
            <p className="mt-1 text-ink-muted">Katılınca lamban yandığında buradakiler de görür.</p>
            <form action={joinPublicRoom.bind(null, room.id)} className="mt-5">
              <button type="submit" className="btn-primary w-full">
                Odaya katıl
              </button>
            </form>
          </section>
        )}

        <RoomLive roomId={room.id} meId={user.id} initial={live} />

        {room.role && <InvitePanel code={room.code} roomName={room.name} />}

        {room.role === "owner" && (
          <details className="group border-t border-line pt-4">
            <summary className="cursor-pointer list-none text-[15px] font-medium text-ink-muted hover:text-ink">
              Oda ayarları <span className="inline-block transition group-open:rotate-90">›</span>
            </summary>
            <div className="mt-5 space-y-6">
              <form action={regenerateRoomCode.bind(null, room.id)}>
                <button type="submit" className="btn-secondary btn-sm">
                  Davet kodunu yenile
                </button>
                <p className="mt-2 text-[13px] text-ink-muted">
                  Eski kod ve link çalışmaz olur. Odadaki herkes yerinde kalır.
                </p>
              </form>
              <details>
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-danger">Odayı sil…</summary>
                <form action={deleteRoom.bind(null, room.id)} className="mt-3">
                  <p className="mb-3 text-[14px] text-ink-muted">
                    Oda ve üyelik kayıtları silinir. Kimsenin çalışma süresi silinmez.
                  </p>
                  <button type="submit" className="text-[15px] font-semibold text-danger underline underline-offset-4">
                    Evet, “{room.name}” odasını sil
                  </button>
                </form>
              </details>
            </div>
          </details>
        )}

        {room.role === "member" && (
          <form action={leaveRoom.bind(null, room.id)} className="border-t border-line pt-4">
            <button type="submit" className="text-[15px] font-medium text-danger">
              Odadan ayrıl
            </button>
          </form>
        )}
      </div>
    </RoomChatPanel>
  );
}
