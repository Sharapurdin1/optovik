import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Драйвер базы (libsql/SQLite) содержит нативный модуль — его нельзя
  // упаковывать сборщиком, поэтому помечаем как внешний.
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
