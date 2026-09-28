// Код, который выполняется один раз при старте сервера Next.js
// (до того, как он начнёт принимать запросы), и перехват ошибок сервера.

import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  await import("./instrumentation-node");
}

// Любая необработанная ошибка на сервере → тревога владельцу в Telegram.
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const message = err instanceof Error ? err.message : String(err);
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  const { alertServerError } = await import("./lib/alerts");
  await alertServerError(message, `${request.method} ${request.path}`, digest);
};
