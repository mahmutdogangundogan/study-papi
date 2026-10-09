// `pnpm dev` ve `pnpm start` bunu çalıştırır: Next.js + aynı portta anlık güncellemeler için WebSocket (/ws).
// Next.js'in route handler'ları WebSocket kabul etmediği için özel sunucu gerekiyor (src/realtime/server.mts).
import { createServer } from "node:http";
import { parseArgs } from "node:util";
import next from "next";
import { attachRealtime } from "./src/realtime/server.mts";

// `next dev` / `next start` gibi: `pnpm dev --port 3100` ya da `PORT=3100 pnpm dev`
const { values: args } = parseArgs({ options: { port: { type: "string", short: "p" } } });
const port = Number(args.port ?? process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== "production";

const server = createServer((req, res) => handle(req, res));
const app = next({ dev, port, httpServer: server });
// prepare() .env dosyalarını da yükler
await app.prepare();
const handle = app.getRequestHandler();
await attachRealtime(server, process.env.DATABASE_URL!);

// Host verilmedi: LAN'daki diğer cihazlar da bağlanabilsin
server.listen(port, () => {
  console.log(`> http://localhost:${port} (${dev ? "development" : "production"})`);
});
