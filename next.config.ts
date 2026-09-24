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
};

export default nextConfig;
