import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Компактная сборка для Docker: .next/standalone содержит сервер и только
  // нужные ему файлы из node_modules.
  output: "standalone",
  // Миграции читаются с диска при старте (src/instrumentation-node.ts) —
  // явно кладём их в сборку.
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  poweredByHeader: false,
  images: {
    // Фото товаров лежат в S3 (Timeweb). Адрес известен при сборке образа,
    // поэтому задан здесь, а не в .env сервера.
    remotePatterns: [new URL("https://optovik-images.s3.twcstorage.ru/products/**")],
    // Ключи фото уникальны и не меняются — кэшируем уменьшенные копии надолго.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
