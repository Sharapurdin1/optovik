#!/usr/bin/env bash
# Ежедневная копия базы (второй бэкап — независимо от бэкапов Timeweb).
#
# 1) pg_dump с сервера приложения → /opt/optovik/backups, храним 14 дней.
#    Копия проверяется (архив читается, заказы в нём есть).
# 2) Если настроено (deploy/setup-offsite-backup.sh) — та же копия, зашифрованная
#    открытым ключом age, уходит на Яндекс Диск в папку optovik-backups:
#    optovik-day-ДД.dump.age — по дню месяца (перезаписывается, ~30 последних дней),
#    monthly/optovik-ГГГГ-ММ.dump.age — 1-го числа, хранится всегда.
#    Расшифровать можно только закрытым ключом владельца (на сервере его нет).
# Если что-то не так — сообщение владельцу в Telegram.
#
# Запускается таймером systemd (deploy/optovik-backup.timer) каждую ночь.
# Вручную: /opt/optovik/backup-db.sh
# Восстановить:
#   age -d -i optovik-backup-key.txt optovik-day-ДД.dump.age > optovik.dump   (если с Диска)
#   pg_restore --clean --if-exists --no-owner -d "<DATABASE_URL>" optovik.dump

set -euo pipefail

DIR=/opt/optovik/backups
KEEP_DAYS=14
ENV_FILE=${ENV_FILE:-/opt/optovik/.env}
# Настройки копии вне Timeweb — отдельно от .env, чтобы пароль от Диска
# не попадал в окружение приложения.
BACKUP_ENV=${BACKUP_ENV:-/opt/optovik/backup.env}
DAV=${BACKUP_DAV_URL:-https://webdav.yandex.ru/optovik-backups}

# Значение из env-файла (без source: в паролях бывают спецсимволы).
env_get() {
  [ -f "$1" ] || return 0
  grep -m1 "^$2=" "$1" | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}

DATABASE_URL=$(env_get "$ENV_FILE" DATABASE_URL)
TG_TOKEN=$(env_get "$ENV_FILE" TELEGRAM_BOT_TOKEN)
TG_CHAT=$(env_get "$ENV_FILE" TELEGRAM_CHAT_ID)
TG_API=$(env_get "$ENV_FILE" TELEGRAM_API_URL)
TG_API=${TG_API:-https://api.telegram.org}
YADISK_LOGIN=$(env_get "$BACKUP_ENV" YADISK_LOGIN)
YADISK_PASSWORD=$(env_get "$BACKUP_ENV" YADISK_PASSWORD)
AGE_RECIPIENT=$(env_get "$BACKUP_ENV" BACKUP_AGE_RECIPIENT)

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

# Запрос к Яндекс Диску. Логин и пароль — через stdin (-K -), а не в командной
# строке: так их не видно в списке процессов.
dav() {
  printf 'user = "%s:%s"\n' "$YADISK_LOGIN" "$YADISK_PASSWORD" | curl -sS -m 120 --retry 3 -K - "$@"
}

# Загрузить файл и убедиться, что на Диске лежит ровно он.
dav_put() {
  local src=$1 url=$2 code
  code=$(dav -o /dev/null -w '%{http_code}' -T "$src" "$url") || return 1
  case "$code" in
    200 | 201 | 204) ;;
    *) echo "Яндекс Диск ответил $code на загрузку $url" >&2; return 1 ;;
  esac
  dav --fail -o "$src.check" "$url" || return 1
  if ! cmp -s "$src" "$src.check"; then
    echo "Файл на Диске отличается от отправленного: $url" >&2
    rm -f "$src.check"
    return 1
  fi
  rm -f "$src.check"
}

# Зашифровать копию и отправить на Диск. Вызывается в if — поэтому каждая
# ошибка проверяется явно (set -e внутри условия не действует).
offsite_upload() {
  local enc="$FILE.age" day
  age -r "$AGE_RECIPIENT" -o "$enc" "$FILE" || return 1
  # Папки: если уже есть, Диск ответит 405 — это нормально.
  dav -o /dev/null -X MKCOL "$DAV/" || return 1
  dav -o /dev/null -X MKCOL "$DAV/monthly/" || return 1
  day="optovik-day-$(date +%d).dump.age"
  dav_put "$enc" "$DAV/$day" || return 1
  if [ "$(date +%d)" = "01" ]; then
    dav_put "$enc" "$DAV/monthly/optovik-$(date +%Y-%m).dump.age" || return 1
  fi
  rm -f "$enc"
  echo "☁️ На Яндекс Диске: optovik-backups/$day"
}

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
find "$DIR" -name '*.age*' -mmin +60 -delete

echo "✅ $(basename "$FILE"), $(du -h "$FILE" | cut -f1); копий: $(find "$DIR" -name 'optovik-*.dump' | wc -l)"

# Копия вне Timeweb.
if [ -n "$YADISK_LOGIN" ] && [ -n "$YADISK_PASSWORD" ] && [ -n "$AGE_RECIPIENT" ]; then
  if ! offsite_upload; then
    rm -f "$FILE.age" "$FILE.age.check"
    alert "⚠️ Копия базы сделана на сервере, но НЕ отправлена на Яндекс Диск ($(date "+%d.%m %H:%M")). Подробности на сервере: journalctl -u optovik-backup"
    exit 1
  fi
fi
