import type { Metadata } from "next";
import { CreateRoomForm } from "@/components/room-forms";

export const metadata: Metadata = { title: "Oda aç" };

export default function NewRoomPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-[30px] leading-tight font-bold">Yeni bir oda aç</h1>
        <p className="mt-1.5 text-ink-muted">
          Açtıktan sonra sana bir davet kodu verilecek. Kodu ya da linki arkadaşlarına gönderirsin.
        </p>
      </header>
      <CreateRoomForm />
    </div>
  );
}
