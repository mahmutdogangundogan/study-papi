#!/bin/bash
# [dev] MacBook'tan Mac mini'ye yeni sürüm yayınlar (https://study.huskocaturk.dev).
#
#   deploy/deploy.sh               # lint + staging build + migration + duman testi + geçiş
#   deploy/deploy.sh --skip-checks # yerel lint'i atla
#   deploy/deploy.sh --rollback    # bir önceki sürüme dön
#   deploy/deploy.sh --status      # mini'de ne çalışıyor
#
# Akış: canlı dizin APFS ile klonlanır (~/study-papi-staging, node_modules ve .env dahil) -> kod
# rsync ile staging'e -> pnpm install (lock değiştiyse) + build -> migration -> staging 3003'te
# açılıp test edilir -> pm2 durur, dizinler yer değiştirir (canlı -> ~/study-papi.prev), pm2 kalkar.
# Build ya da test patlarsa canlıya dokunulmaz. Kesinti: geçiş sırasında birkaç saniye.
# Not: migration canlı DB'ye geçişten ÖNCE uygulanır; geri dönüş şemayı geri almaz.
#
# Mini'deki düzen:
#   ~/study-papi/.env       DATABASE_URL=postgres://studypapi:<şifre>@127.0.0.1:5433/studypapi  (600)
#   ~/study-papi/.env.prod  POSTGRES_PASSWORD=<şifre>                                          (600)
#   DB:  docker compose --env-file .env.prod -f deploy/compose.prod.yaml up -d   (study-papi-db)
#   pm2: study-papi -> 127.0.0.1:3002; tünel erasmus-mini: study.huskocaturk.dev -> http://127.0.0.1:3002
set -euo pipefail

MINI="${MINI:-huseyinkocaturk@Huseyin-Mac-mini.local}"
PUBLIC_URL="${PUBLIC_URL:-https://study.huskocaturk.dev}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=10 "$MINI")

# Mini'de asla ezilmeyecek / silinmeyecek yollar (rsync --delete excluded dosyaları silmez)
EXCLUDES=(
  --include=.env.example
  --exclude=.git/ --exclude=node_modules/ --exclude=.next/ --exclude=.env --exclude='.env.*'
  --exclude=.DS_Store --exclude='*.log' --exclude=.deployed --exclude=next-env.d.ts
)

# Mini tarafında çalışan ortak kabuk öneki (bash -s, zsh profili okunmaz)
REMOTE_ENV='set -euo pipefail
export PATH="$HOME/.local/opt/node/bin:$HOME/.local/bin:$HOME/.docker/bin:/usr/bin:/bin:/usr/sbin:/sbin"
LIVE="$HOME/study-papi"; STAGE="$HOME/study-papi-staging"; PREV="$HOME/study-papi.prev"
wait_up() { for _ in $(seq 1 "${2:-40}"); do [ "$(curl -s -o /dev/null -w "%{http_code}" "127.0.0.1:$1/login")" = 200 ] && return 0; sleep 1; done; return 1; }'

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
remote() { "${SSH[@]}" "bash -s -- $(printf '%q ' "$@")"; }

case "${1:-}" in
  --status)
    remote <<EOF
$REMOTE_ENV
cat "\$LIVE/.deployed" 2>/dev/null || echo "(.deployed yok)"
[ -d "\$PREV" ] && echo "geri dönüş sürümü: \$(head -1 "\$PREV/.deployed" 2>/dev/null || echo bilinmiyor)"
pm2 jlist | node -e 'for (const p of JSON.parse(require("fs").readFileSync(0))) console.log(p.name, p.pm2_env.status, "restart="+p.pm2_env.restart_time, Math.round(p.monit.memory/1e6)+"MB")'
docker ps --filter name=study-papi-db --format '{{.Names}} {{.Status}}'
EOF
    curl -s -o /dev/null -w "dışarıdan $PUBLIC_URL -> HTTP %{http_code}\n" "$PUBLIC_URL/login"
    exit 0 ;;
  --rollback)
    say "Bir önceki sürüme dönülüyor"
    remote <<EOF
$REMOTE_ENV
[ -d "\$PREV" ] || { echo "geri dönülecek sürüm yok (\$PREV)"; exit 1; }
pm2 stop study-papi >/dev/null
rm -rf "\$HOME/study-papi.failed"
mv "\$LIVE" "\$HOME/study-papi.failed"
mv "\$PREV" "\$LIVE"
pm2 start study-papi >/dev/null
wait_up 3002 || { echo "UYARI: geri dönülen sürüm de ayağa kalkmadı"; exit 1; }
echo "geri dönüldü: \$(head -1 "\$LIVE/.deployed" 2>/dev/null)"
EOF
    exit 0 ;;
  ""|--skip-checks) ;;
  *) echo "bilinmeyen seçenek: $1"; exit 2 ;;
esac

cd "$ROOT"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
DIRTY=""; [ -n "$(git status --porcelain 2>/dev/null)" ] && DIRTY="+degisiklik"
VERSION="$COMMIT$DIRTY $(date '+%F %T') $(whoami)@$(hostname -s)"
[ -n "$DIRTY" ] && echo "NOT: commit'lenmemiş değişiklikler var; sürüm '$COMMIT$DIRTY' olarak işaretlenecek."

if [ "${1:-}" != "--skip-checks" ] && [ -d node_modules ]; then
  say "Yerel kontrol (eslint)"
  npx eslint . && echo "eslint ok"
fi

say "Staging hazırlanıyor (canlı dizinin klonu)"
remote <<EOF
$REMOTE_ENV
rm -rf "\$STAGE"
cp -cR "\$LIVE" "\$STAGE"
EOF

say "Kod gönderiliyor"
rsync -a --delete --stats "${EXCLUDES[@]}" ./ "$MINI:study-papi-staging/" | grep -E "files transferred|Total transferred"

say "Staging build + migration + duman testi"
remote "$VERSION" <<EOF
$REMOTE_ENV
cd "\$STAGE"
if ! cmp -s pnpm-lock.yaml "\$LIVE/pnpm-lock.yaml" || [ ! -d node_modules ]; then
  echo "pnpm-lock değişmiş -> pnpm install"; pnpm install --frozen-lockfile >/dev/null
fi
pnpm build > build.log 2>&1 || { tail -30 build.log; echo "BUILD BAŞARISIZ - canlıya dokunulmadı"; exit 1; }
echo "build ok"
pnpm db:migrate > migrate.log 2>&1 || { tail -20 migrate.log; echo "MIGRATION BAŞARISIZ - uygulama değişmedi"; exit 1; }
echo "migration ok"
PORT=3003 LISTEN_HOST=127.0.0.1 NODE_ENV=production node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON server.mts > smoke.log 2>&1 &
SPID=\$!
trap 'kill \$SPID 2>/dev/null || true' EXIT
fail() { echo "DUMAN TESTİ BAŞARISIZ: \$1 - canlıya dokunulmadı"; tail -20 smoke.log; exit 1; }
wait_up 3003 || fail "/login"
[ "\$(curl -s -o /dev/null -w '%{http_code}' 127.0.0.1:3003/)" = 200 ] || fail "ana sayfa"
# Çerezsiz WebSocket isteği 401 almalı (özel sunucu ve realtime ayakta)
[ "\$(curl -s -o /dev/null -w '%{http_code}' -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' 127.0.0.1:3003/ws)" = 401 ] || fail "/ws"
echo "duman testi ok (/login, /, /ws)"
printf '%s\n' "\$1" > .deployed
EOF

say "Geçiş (kısa kesinti)"
remote <<EOF
$REMOTE_ENV
pm2 stop study-papi >/dev/null
rm -rf "\$PREV"
mv "\$LIVE" "\$PREV"
mv "\$STAGE" "\$LIVE"
pm2 start study-papi >/dev/null
if ! wait_up 3002; then
  echo "YENİ SÜRÜM AYAĞA KALKMADI -> otomatik geri dönülüyor"
  pm2 stop study-papi >/dev/null
  rm -rf "\$HOME/study-papi.failed"; mv "\$LIVE" "\$HOME/study-papi.failed"; mv "\$PREV" "\$LIVE"
  pm2 start study-papi >/dev/null; wait_up 3002 && echo "eski sürüm ayakta"; exit 1
fi
pm2 save >/dev/null
echo "canlı: \$(cat "\$LIVE/.deployed")"
EOF

say "Dışarıdan kontrol"
curl -s -o /dev/null -w "$PUBLIC_URL -> HTTP %{http_code} (%{time_total}s)\n" "$PUBLIC_URL/login"
echo "Geri dönmek için: deploy/deploy.sh --rollback"
