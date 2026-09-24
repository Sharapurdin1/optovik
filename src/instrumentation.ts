// Код, который выполняется один раз при старте сервера Next.js
// (до того, как он начнёт принимать запросы).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  await import("./instrumentation-node");
}
