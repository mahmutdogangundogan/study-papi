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

- **Timer bugünkü toplamı gösterir.** Ara verince durur, devam edince kaldığı yerden sayar, her gece 03.00'te (TSİ, `src/lib/study-day.ts`) sıfırlanır; gece yarısını geçen çalışma önceki güne sayılır. Açık sekme kendi timer durumunu 30 sn'de bir tazeler; başka cihazdan başlatılan timer da görünür.
- **Unutulan timer kendiliğinden durur.** Timer 3 saat kesintisiz çalışınca "Hâlâ çalışıyor musun?" diye sorar. 1 saat içinde onaylanırsa o süre de sayılır ve 3 saat sonra yine sorar. Onaylanmazsa timer durur ve sorunun çıktığı andan sonrası sayılmaz. Süreler `src/lib/timer-rules.ts` içinde. Ayrı bir zamanlanmış görev yok; süresi dolanlar, timer durumunu okuyan sorgulardan önce kapatılır.
- **Timer kişiye aittir, odaya değil.** `study_sessions` tablosunda `ended_at` değeri boş olan kayıt, o kişinin çalışan timer'ıdır. Kısmi bir unique index (`study_sessions_one_active_per_user`) aynı anda birden fazla açık timer olmasını engeller. Kişi 3 odadaysa 3 odada da aynı timer görünür.
- **Odalar public ya da private olabilir.** Public odalar Keşfet sayfasında aranabilir. Private odalara yalnızca davet linkiyle (`/join/KOD`) ya da kodla girilir; oda üyesi olmayan biri private odayı göremez.
- **Oda kodu unique'tir** (8 karakter, karışabilecek 0/O ve 1/I harfleri hariç). Davet linki de aynı kodu kullanır. Oda sahibi kodu yenileyebilir; bu durumda eski link ve kod geçersiz olur.
- Kod girerken küçük harf, tire ya da davet linkinin tamamı yazılabilir; hepsi kabul edilir.

## Mimari

| Yer | Ne yapar |
| --- | --- |
| `src/db/schema.ts` | Drizzle şeması: users, auth_sessions, rooms, room_members, study_sessions |
| `src/lib/session.ts` | Kullanıcı adı ve şifre ile oturum. Token çerezde, SHA-256 özeti veritabanında, 30 gün geçerli |
| `src/lib/password.ts` | scrypt ile şifre hash'leme (node:crypto, ek paket yok) |
| `src/lib/data.ts` | Oda ve timer sorguları, "bugün toplam" hesabı (gün TSİ 03.00'te başlar) |
| `src/actions/*` | Server Action'lar: giriş/kayıt, oda oluşturma/katılma/ayrılma, timer başlat/durdur |
| `src/app/api/rooms/[id]/live` | Odadakilerin canlı durumu (istemci 5 sn'de bir sorar) |
| `src/components/timer-provider.tsx` | Kişinin tek timer state'i; header ve oda sayfası bunu paylaşır |
| `src/proxy.ts` | Çerez yoksa giriş sayfasına yönlendirir (`?next=` ile geri döner) |

Saniyelik sayma istemcide yapılır. Telefonun saati yanlış olsa bile süreler doğru görünsün diye istemci saati sunucu saatine göre düzeltilir (`syncClock`).

## Scriptler

`pnpm db:generate` (şemadan migration üretir) · `pnpm db:migrate` · `pnpm db:studio` · `pnpm db:seed` · `pnpm lint` · `pnpm build`

## Katkıda bulunanlar

- [@mahmutdogangundogan](https://github.com/mahmutdogangundogan)
- [@sadecehus](https://github.com/sadecehus)
- [@eminkay](https://github.com/eminkay)
