// Адрес сайта для абсолютных ссылок (sitemap, превью в мессенджерах).
// Берётся из APP_URL во время запроса — при сборке образа его нет.
export function siteUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}
