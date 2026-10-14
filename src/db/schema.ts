import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  // Her zaman küçük harfle saklanır, böylece "Ali" ve "ali" aynı kullanıcı sayılır
  username: text().notNull().unique(),
  displayName: text().notNull(),
  passwordHash: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    // Çerezdeki token'ın SHA-256 özeti; token'ın kendisi veritabanında tutulmaz
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index().on(t.userId)],
);

export const roomVisibility = pgEnum("room_visibility", ["public", "private"]);
export const memberRole = pgEnum("member_role", ["owner", "member"]);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    description: text().notNull().default(""),
    visibility: roomVisibility().notNull().default("public"),
    // Davet kodu; davet linki de bu kodu kullanır (/join/KOD)
    code: text().notNull().unique(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.visibility)],
);

export const roomMembers = pgTable(
  "room_members",
  {
    roomId: uuid()
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole().notNull().default("member"),
    joinedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] }), index().on(t.userId)],
);

// Timer kişiye aittir, odaya değil: endedAt'i boş olan kayıt kişinin çalışan timer'ıdır.
export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp({ withTimezone: true }),
    // Bu saatte "Hâlâ çalışıyor musun?" sorulur; onay gelmezse timer bu saatte durmuş sayılır (bkz. src/lib/timer-rules.ts)
    confirmedUntil: timestamp({ withTimezone: true })
      .notNull()
      .default(sql`now() + interval '3 hours'`),
    // Onay gelmediği için otomatik durduysa true
    autoStopped: boolean().notNull().default(false),
  },
  (t) => [
    // Bir kişinin aynı anda en fazla bir açık timer'ı olabilir
    uniqueIndex("study_sessions_one_active_per_user")
      .on(t.userId)
      .where(sql`${t.endedAt} is null`),
    index().on(t.userId, t.startedAt),
  ],
);

// Oda sohbeti. id artan sayı: hem sıralama hem "daha eski mesajlar" için imleç
export const roomMessages = pgTable(
  "room_messages",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    roomId: uuid()
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.roomId, t.id)],
);

// Kişiye özel not defteri (kişi başına tek kayıt). version her kayıtta artar: iki sekme/cihaz açıksa
// eski sürümün üstüne yazılmaz, çakışma olarak döner (bkz. saveNotes, src/lib/data.ts)
export const userNotes = pgTable("user_notes", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text().notNull().default(""),
  version: integer().notNull().default(1),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Room = typeof rooms.$inferSelect;
