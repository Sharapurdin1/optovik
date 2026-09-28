// robots.txt: служебные и личные страницы — не для поисковиков.
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteUrl } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection(); // адрес сайта известен только на сервере во время запроса
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/manage", "/api/", "/cart", "/orders", "/profile"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
