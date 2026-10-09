import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile();
} catch {
  // .env yoksa ortam değişkenleri doğrudan kullanılır
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  casing: "snake_case",
});
