#!/usr/bin/env bash
# Подключить копию базы на Яндекс Диск (один раз; повторить — если сменили пароль).
# Запускать в своём терминале:
#   ssh -t deploy@<сервер> /opt/optovik/setup-offsite-backup.sh
#
# Спрашивает логин Яндекса и пароль приложения (тип «Файлы (WebDAV)», создаётся
# на id.yandex.ru → Безопасность → Пароли приложений), проверяет доступ,
# сохраняет в /opt/optovik/backup.env и сразу делает пробную копию.
# Пароль на экране не показывается и никуда, кроме backup.env, не пишется.

set -euo pipefail

BACKUP_ENV=/opt/optovik/backup.env

if ! grep -q '^BACKUP_AGE_RECIPIENT=age1' "$BACKUP_ENV" 2>/dev/null; then
  echo "❌ В $BACKUP_ENV нет открытого ключа шифрования BACKUP_AGE_RECIPIENT"
  exit 1
fi

while true; do
  read -rp "Логин Яндекса (например, optovik.backup): " LOGIN
  LOGIN=$(echo "$LOGIN" | tr -d '[:space:]')
  read -rsp "Пароль приложения (ввод не отображается): " PW
  echo
  PW=$(echo "$PW" | tr -d '[:space:]')

  if ! [[ "$LOGIN" =~ ^[A-Za-z0-9._@-]+$ ]]; then
    echo "Логин — латиница, цифры, точка, дефис. Ещё раз."
    continue
  fi
  if ! [[ "$PW" =~ ^[A-Za-z0-9]+$ ]]; then
    echo "Пароль приложения — латинские буквы и цифры (16 знаков). Ещё раз."
    continue
  fi

  code=$(printf 'user = "%s:%s"\n' "$LOGIN" "$PW" |
    curl -sS -m 30 -K - -o /dev/null -w '%{http_code}' -X PROPFIND -H 'Depth: 0' \
      https://webdav.yandex.ru/ || true)
  [ "$code" = "207" ] && break
  echo "Яндекс не пустил (ответ: ${code:-нет связи})."
  echo "Проверьте логин и что пароль приложения — типа «Файлы (WebDAV)». Попробуйте ещё раз."
done

umask 077
sed -i '/^YADISK_LOGIN=/d; /^YADISK_PASSWORD=/d' "$BACKUP_ENV"
printf 'YADISK_LOGIN=%s\nYADISK_PASSWORD=%s\n' "$LOGIN" "$PW" >> "$BACKUP_ENV"
unset PW

echo "✅ Доступ к Яндекс Диску сохранён. Делаю пробную копию…"
/opt/optovik/backup-db.sh
echo "Готово: каждую ночь копия будет уходить в папку «optovik-backups» на Яндекс Диске."
