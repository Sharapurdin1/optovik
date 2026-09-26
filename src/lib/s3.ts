// Хранилище фото товаров (S3 в Timeweb Cloud).
//
// Фото загружаются через наш сервер: он уменьшает их и перекодирует в WebP,
// а в бакет кладёт уже лёгкий файл. Бакет публичный на чтение — покупатели
// получают фото напрямую из S3, записывать может только сервер по ключам.

import "server-only";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const MAX_SIDE = 1600; // px — больше для карточки товара не нужно
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 МБ на один файл

let client: S3Client | null = null;

function s3(): S3Client {
  if (client) return client;
  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    throw new Error("Хранилище фото не настроено (S3_* в .env)");
  }
  client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION || "ru-1",
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
    forcePathStyle: true,
    // S3-совместимые хранилища не всегда понимают новые контрольные суммы AWS.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

function bucket(): string {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error("Не задан S3_BUCKET");
  return b;
}

export function s3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY &&
      process.env.S3_PUBLIC_URL
  );
}

// Публичный адрес фото по ключу объекта.
export function publicUrl(key: string): string {
  const base = (process.env.S3_PUBLIC_URL ?? "").replace(/\/+$/, "");
  return `${base}/${key}`;
}

// Уменьшить фото, перекодировать в WebP и загрузить. Возвращает ключ объекта.
// Бросает ошибку с понятным текстом, если файл — не картинка.
export async function uploadProductImage(input: Buffer): Promise<string> {
  let webp: Buffer;
  try {
    webp = await sharp(input, { failOn: "error" })
      .rotate() // учесть поворот из EXIF (фото с телефона)
      .resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new Error("Не удалось прочитать файл как изображение (нужен JPG, PNG или WebP)");
  }

  // id товара бывает кириллицей — в ключ его не кладём, связь хранится в базе.
  const key = `products/${randomUUID()}.webp`;
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: webp,
      ContentType: "image/webp",
      // Ключ уникален и файл никогда не меняется — можно кэшировать навсегда.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return key;
}

// Удалить объекты из бакета. Ошибки только логируем: лишний файл в S3
// не должен мешать удалению фото или товара в админке.
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  // По одному: пакетное удаление требует Content-MD5, который
  // S3-совместимые хранилища проверяют по-разному.
  const results = await Promise.allSettled(
    keys.map((Key) => s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key })))
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error("S3: не удалось удалить файл", keys[i], r.reason);
    }
  });
}
