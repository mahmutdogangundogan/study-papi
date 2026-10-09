import type { Metadata } from "next";
import { CreateRoomForm } from "@/components/room-forms";

export const metadata: Metadata = { title: "Oda aç" };

export default function NewRoomPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Yeni oda</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Odayı açtıktan sonra davet linkini ya da kodunu arkadaşlarınla paylaşabilirsin.
        </p>
      </div>
      <CreateRoomForm />
    </div>
  );
}
