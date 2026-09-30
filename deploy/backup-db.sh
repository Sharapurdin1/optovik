#!/usr/bin/env bash
# Ежедневная копия базы (второй бэкап — независимо от бэкапов Timeweb).
#
# pg_dump с сервера приложения → /opt/optovik/backups, храним 14 дней.
# Копия проверяется (архив читается, заказы в нём есть). Если что-то
# не так — сообщение владельцу в Telegram.
#
# Запускается таймером systemd (deploy/optovik-backup.timer) каждую ночь.
# Вручную: /opt/optovik/backup-db.sh
# Восстановить: pg_restore --clean --if-exists --no-owner -d "<DATABASE_URL>" <файл.dump>

set -euo pipefail

DIR=/opt/optovik/backups
KEEP_DAYS=14
ENV_FILE=${ENV_FILE:-/opt/optovik/.env}

# Значение из .env (без source: в паролях бывают спецсимволы).
env_get() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true; }

DATABASE_URL=$(env_get DATABASE_URL)
TG_TOKEN=$(env_get TELEGRAM_BOT_TOKEN)
TG_CHAT=$(env_get TELEGRAM_CHAT_ID)
TG_API=$(env_get TELEGRAM_API_URL)
TG_API=${TG_API:-https://api.telegram.org}

alert() {
  [ -n "$TG_TOKEN" ] && [ -n "$TG_CHAT" ] || return 0
  local code
  code=$(curl -sS -m 20 --retry 3 -o /dev/null -w '%{http_code}' "$TG_API/bot$TG_TOKEN/sendMessage" \
    --data-urlencode "chat_id=$TG_CHAT" --data-urlencode "text=$1" || true)
  [ "$code" = "200" ] || echo "⚠️ Не удалось отправить тревогу в Telegram (ответ: ${code:-нет связи})" >&2
}
on_error() {
  [ -n "${FILE:-}" ] && rm -f "$FILE.part"
  alert "🚨 Копия базы НЕ сделана ($(date "+%d.%m %H:%M")). Подробности на сервере: journalctl -u optovik-backup"
}
trap on_error ERR

umask 077
mkdir -p "$DIR"
FILE="$DIR/optovik-$(date +%Y-%m-%d_%H%M).dump"

pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$FILE.part"

# Копия должна читаться и содержать данные заказов (grep без -q: иначе pipefail
# срабатывает на SIGPIPE у pg_restore).
pg_restore --list "$FILE.part" | grep "TABLE DATA public orders" > /dev/null
mv "$FILE.part" "$FILE"

# Старые копии и недописанные остатки.
find "$DIR" -name 'optovik-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$DIR" -name '*.part' -mmin +60 -delete

echo "✅ $(basename "$FILE"), $(du -h "$FILE" | cut -f1); копий: $(find "$DIR" -name 'optovik-*.dump' | wc -l)"
