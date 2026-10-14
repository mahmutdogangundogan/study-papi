# Study Papi

Arkadaşlarınla aynı odada çalış: giriş yap, odaya gir, timer'ını başlat; odadakiler seni canlı olarak çalışırken görsün.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · Tailwind v4 · Drizzle ORM · PostgreSQL 18 · pnpm

## Kurulum

```bash
pnpm install
cp .env.example .env      # DATABASE_URL
pnpm db:up                # docker compose ile postgres 18 (host portu 5433)
pnpm db:migrate           # şemayı uygula
pnpm db:seed              # isteğe bağlı demo veri: ali / ayse / mert, şifre: papi1234
pnpm dev
```

Postgres portunu değiştirmek için `POSTGRES_PORT=5432 pnpm db:up` yaz ve `.env` içindeki `DATABASE_URL`'i de buna göre güncelle.

## Kurallar

- **Timer bugünkü toplamı gösterir.** Ara verince durur, devam edince kaldığı yerden sayar, her gece 03.00'te (TSİ, `src/lib/study-day.ts`) sıfırlanır; gece yarısını geçen çalışma önceki güne sayılır. Başka cihazdan başlatılan timer da anında görünür.
- **Unutulan timer kendiliğinden durur.** Timer 3 saat kesintisiz çalışınca "Hâlâ çalışıyor musun?" diye sorar. 1 saat içinde onaylanırsa o süre de sayılır ve 3 saat sonra yine sorar. Onaylanmazsa timer durur ve sorunun çıktığı andan sonrası sayılmaz. Süreler `src/lib/timer-rules.ts` içinde. Süresi dolan timer'ı realtime sunucusu tam o anda kapatır; timer durumunu okuyan sorgular da okumadan önce kapatır.
- **Timer kişiye aittir, odaya değil.** `study_sessions` tablosunda `ended_at` değeri boş olan kayıt, o kişinin çalışan timer'ıdır. Kısmi bir unique index (`study_sessions_one_active_per_user`) aynı anda birden fazla açık timer olmasını engeller. Kişi 3 odadaysa 3 odada da aynı timer görünür.
- **Odalar public ya da private olabilir.** Public odalar Keşfet sayfasında aranabilir. Private odalara yalnızca davet linkiyle (`/join/KOD`) ya da kodla girilir; oda üyesi olmayan biri private odayı göremez.
- **Oda kodu unique'tir** (8 karakter, karışabilecek 0/O ve 1/I harfleri hariç). Davet linki de aynı kodu kullanır. Oda sahibi kodu yenileyebilir; bu durumda eski link ve kod geçersiz olur.
- Kod girerken küçük harf, tire ya da davet linkinin tamamı yazılabilir; hepsi kabul edilir.
- **Her odanın bir sohbeti var.** Yalnızca üyeler yazabilir; odayı görebilen herkes (public odada herkes, private odada üyeler) okuyabilir. Mesajlar saklanır, sayfa yenilenince son 50 mesaj gelir, öncesi "Önceki mesajlar" ile yüklenir. Mesaj en fazla 500 karakter; 10 saniyede en fazla 5 mesaj.
- **Oda sayfasında iki yan panel var:** sağda sohbet, solda kişisel notlar. Aynı anda biri açık olur; açılınca oda içeriği öbür yana kayar. Sohbet kapalıyken gelen mesajların sayısı sohbet sekmesinde görünür.
- **Kişisel notlar kişiye aittir** (timer gibi): tek defter, her odada aynı, sadece sahibi görür. Yazmayı bırakınca kendiliğinden kaydedilir. Her kayıt sürüm numarası taşır; başka sekmede/cihazda arada kaydedilmiş notun üstüne yazılmaz, o hal yüklenir ve haber verilir.
- **Profil istatistikleri ayrı bir tabloda tutulmaz**, `study_sessions`'tan hesaplanır; böylece timer'la hiç ayrışmaz. Günler timer'daki gibi 03.00'te (TSİ) başlar. Haftalık ortalama son 4 haftaya bakar (yeni katılanda katıldığından beri geçen haftalara), seri en az 1 dakika çalışılan art arda günlerdir.

## Mimari

| Yer | Ne yapar |
| --- | --- |
| `src/db/schema.ts` | Drizzle şeması: users, auth_sessions, rooms, room_members, study_sessions |
| `src/lib/session.ts` | Kullanıcı adı ve şifre ile oturum. Token çerezde, SHA-256 özeti veritabanında, 30 gün geçerli |
| `src/lib/password.ts` | scrypt ile şifre hash'leme (node:crypto, ek paket yok) |
| `src/lib/data.ts` | Oda ve timer sorguları, "bugün toplam" hesabı (gün TSİ 03.00'te başlar) |
| `src/actions/*` | Server Action'lar: giriş/kayıt, oda oluşturma/katılma/ayrılma, timer başlat/durdur |
| `server.mts` | `pnpm dev` / `pnpm start` bunu çalıştırır: Next.js + aynı portta WebSocket (`/ws`) |
| `src/realtime/server.mts` | Postgres `LISTEN` ile timer ve üyelik değişikliklerini dinler, ilgili tarayıcılara "şu değişti" der |
| `drizzle/0002_realtime_notify.sql` | `study_sessions` ve `room_members` değişince `pg_notify` gönderen tetikleyiciler |
| `src/components/live-socket.ts` | Sekme başına tek WebSocket; koparsa yeniden bağlanır, bağlanınca kaçırılanları çektirir |
| `src/app/api/rooms/[id]/live` | Odadakilerin canlı durumu (istemci bildirim gelince çeker) |
| `src/components/timer-provider.tsx` | Kişinin tek timer state'i; header ve oda sayfası bunu paylaşır |
| `src/proxy.ts` | Çerez yoksa giriş sayfasına yönlendirir (`?next=` ile geri döner) |
| `src/components/room-panels.tsx` | Oda sayfasının yan panelleri (solda notlar, sağda sohbet), sekmeler ve okunmamış sayacı |
| `src/actions/chat.ts`, `src/components/room-chat.tsx` | Oda sohbeti: gönderme (Server Action) ve canlı mesaj listesi |
| `src/app/api/me/notes`, `src/components/personal-notes.tsx` | Kişisel notlar: okuma/kaydetme (sayfa kapanırken de gönderilebilsin diye route handler) ve otomatik kaydeden defter |
| `drizzle/0003_room_chat.sql` | `room_messages` tablosu ve yeni mesajda `pg_notify` gönderen tetikleyici |
| `src/app/api/rooms/[id]/messages` | Son mesajlar; `?before=ID` ile öncekiler |
| `src/lib/stats.ts` | Profil istatistikleri (bugün, bu hafta, ortalamalar, seri); günlük toplamlardan hesaplayan saf fonksiyonlar |
| `src/app/(app)/profile/[username]` | Profil sayfası; `/profile` kendi profiline yönlendirir |

Anlık güncelleme: Postgres her timer, üyelik değişikliğinde ve yeni sohbet mesajında `NOTIFY` gönderir, realtime sunucusu bunu WebSocket ile tarayıcıya iletir, tarayıcı da veriyi yukarıdaki API'lerden çeker. Polling yok. Next.js route handler'ları WebSocket kabul etmediği için `next dev` yerine `pnpm dev` kullan; yoksa canlı güncelleme olmaz.

Saniyelik sayma istemcide yapılır. Telefonun saati yanlış olsa bile süreler doğru görünsün diye istemci saati sunucu saatine göre düzeltilir (`syncClock`).

## Scriptler

`pnpm db:generate` (şemadan migration üretir) · `pnpm db:migrate` · `pnpm db:studio` · `pnpm db:seed` · `pnpm lint` · `pnpm build`

## Katkıda bulunanlar

- [@mahmutdogangundogan](https://github.com/mahmutdogangundogan)
- [@sadecehus](https://github.com/sadecehus)
- [@eminkay](https://github.com/eminkay)
