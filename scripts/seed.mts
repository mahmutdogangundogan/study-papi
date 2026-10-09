// Geliştirme için demo veri: `pnpm db:seed`
// Demo kullanıcıların hepsinin şifresi: papi1234
import { randomBytes, scryptSync } from "node:crypto";
import postgres from "postgres";

try {
  process.loadEnvFile();
} catch {}

const sql = postgres(process.env.DATABASE_URL!);
const DEMO_PASSWORD = "papi1234";

function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
}

async function upsertUser(username: string, displayName: string) {
  const [row] = await sql<{ id: string }[]>`
    insert into users (username, display_name, password_hash)
    values (${username}, ${displayName}, ${hashPassword(DEMO_PASSWORD)})
    on conflict (username) do update set display_name = excluded.display_name
    returning id`;
  return row.id;
}

async function upsertRoom(code: string, name: string, description: string, visibility: string, ownerId: string) {
  const [row] = await sql<{ id: string }[]>`
    insert into rooms (code, name, description, visibility, owner_id)
    values (${code}, ${name}, ${description}, ${visibility}, ${ownerId})
    on conflict (code) do update set name = excluded.name
    returning id`;
  await sql`insert into room_members (room_id, user_id, role) values (${row.id}, ${ownerId}, 'owner') on conflict do nothing`;
  return row.id;
}

const ali = await upsertUser("ali", "Ali");
const ayse = await upsertUser("ayse", "Ayşe");
const mert = await upsertUser("mert", "Mert");

const yks = await upsertRoom("YKSKAMP2", "YKS Kampı", "Her gün en az 6 saat 💪", "public", ali);
await upsertRoom("GECEKUS7", "Gece Kuşları", "Sadece davetle", "private", ali);

for (const userId of [ayse, mert]) {
  await sql`insert into room_members (room_id, user_id) values (${yks}, ${userId}) on conflict do nothing`;
}

// Ayşe 42 dakikadır çalışıyor
await sql`
  insert into study_sessions (user_id, started_at)
  values (${ayse}, now() - interval '42 minutes')
  on conflict do nothing`;

console.log("Seed tamam. Kullanıcılar: ali, ayse, mert (şifre: papi1234)");
await sql.end();
