import "server-only";

// Загрузка каталога товаров из Google-таблицы.
//
// Владелец ведёт товары в обычной Google-таблице и «публикует» её как CSV
// (Файл → Поделиться → Опубликовать в интернете → формат CSV).
// Ссылку кладём в .env.local как SHEET_CSV_URL.
//
// Пока таблица не подключена (нет SHEET_CSV_URL) или недоступна —
// используем встроенный список товаров, чтобы магазин продолжал работать.
//
// Ожидаемые колонки таблицы (первая строка — заголовки, порядок любой):
//   Название | Категория | Цена | Единица | Старая цена | Хит | Наличие | Эмодзи

import {
  categories as MASTER_CATEGORIES,
  products as FALLBACK_PRODUCTS,
  type Product,
  type Category,
} from "./products";

export type CatalogData = {
  products: Product[];
  categories: Category[];
  hitProducts: Product[];
};

// Категория для товаров, чья «Категория» не совпала ни с одной известной.
const OTHER: Category = { id: "other", title: "Другое", emoji: "📦" };

// Оставляем только те категории, в которых есть товары (в исходном порядке),
// и добавляем «Другое», если такие товары есть.
function finalize(products: Product[]): CatalogData {
  const present = new Set(products.map((p) => p.categoryId));
  const categories = MASTER_CATEGORIES.filter((c) => present.has(c.id));
  if (present.has(OTHER.id)) categories.push(OTHER);
  return {
    products,
    categories,
    hitProducts: products.filter((p) => p.hit),
  };
}

// --- Разбор CSV ---

// Простой, но корректный разбор CSV: понимает кавычки, запятые внутри кавычек
// и переводы строк. Возвращает массив строк, каждая — массив ячеек.
function parseCSV(text: string): string[][] {
  // убираем BOM, который иногда добавляет Google
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const YES = /^(да|yes|true|1|\+|✓|v|есть|хит)$/i;
const NO = /^(нет|no|false|0|-)$/i;

function isYes(v: string | undefined): boolean {
  return YES.test((v ?? "").trim());
}
function isNo(v: string | undefined): boolean {
  return NO.test((v ?? "").trim());
}

// «79 ₽» → 79, «1 490» → 1490. Возвращает null, если числа нет.
function parseNum(v: string | undefined): number | null {
  const digits = (v ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? null : n;
}

// Название → короткий идентификатор (оставляем и кириллицу).
function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function categoryEmoji(id: string): string {
  return MASTER_CATEGORIES.find((c) => c.id === id)?.emoji ?? "🛒";
}

function rowsToProducts(rows: string[][]): Product[] {
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (names: string[]) =>
    header.findIndex((h) => names.includes(h));

  const iName = col(["название", "товар", "name"]);
  const iCat = col(["категория", "category"]);
  const iPrice = col(["цена", "price"]);
  const iUnit = col(["единица", "ед", "ед.", "unit"]);
  const iOld = col(["старая цена", "старая", "old price"]);
  const iHit = col(["хит", "hit"]);
  const iAvail = col(["наличие", "в наличии", "available"]);
  const iEmoji = col(["эмодзи", "иконка", "значок", "emoji"]);

  // Без названия и цены таблицу читать нельзя.
  if (iName < 0 || iPrice < 0) {
    const missing = [
      iName < 0 ? "«Название»" : null,
      iPrice < 0 ? "«Цена»" : null,
    ]
      .filter(Boolean)
      .join(" и ");
    console.warn(
      `⚠️ Каталог: в таблице не найдены колонки ${missing}. ` +
        `Проверьте первую строку с заголовками (Название, Категория, Цена, ...). ` +
        `Пока показываю запасной список товаров.`
    );
    return [];
  }

  const titleToCategory = new Map(
    MASTER_CATEGORIES.map((c) => [c.title.trim().toLowerCase(), c.id])
  );

  const usedIds = new Set<string>();
  const out: Product[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = (row[iName] ?? "").trim();
    if (!title) continue;

    const price = parseNum(row[iPrice]);
    if (price == null) continue;

    // «Нет в наличии» — прячем товар из магазина.
    const available = iAvail < 0 ? true : !isNo(row[iAvail]);
    if (!available) continue;

    const catTitle =
      iCat >= 0 ? (row[iCat] ?? "").trim().toLowerCase() : "";
    const categoryId = titleToCategory.get(catTitle) ?? OTHER.id;

    const oldPrice = iOld >= 0 ? parseNum(row[iOld]) : null;
    const hit = iHit >= 0 ? isYes(row[iHit]) : false;
    const unit = (iUnit >= 0 ? row[iUnit] : "")?.trim() || "шт";
    const emoji =
      (iEmoji >= 0 ? row[iEmoji] : "")?.trim() || categoryEmoji(categoryId);

    let id = slug(title) || `tovar-${r}`;
    while (usedIds.has(id)) id = `${id}-${r}`;
    usedIds.add(id);

    out.push({
      id,
      title,
      categoryId,
      price,
      unit,
      emoji,
      hit,
      ...(oldPrice && oldPrice > price ? { oldPrice } : {}),
    });
  }

  return out;
}

// Основная функция: отдаёт каталог. Кэшируется на 60 секунд —
// значит, правки в таблице появляются в магазине в течение минуты.
export async function getCatalog(): Promise<CatalogData> {
  const url = process.env.SHEET_CSV_URL;
  if (!url) return finalize(FALLBACK_PRODUCTS);

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`Sheet HTTP ${res.status}`);
    const text = await res.text();
    const products = rowsToProducts(parseCSV(text));
    // Если таблица пустая или колонки не распознаны — не роняем магазин.
    if (products.length === 0) {
      console.warn(
        "⚠️ Каталог: таблица прочитана, но подходящих товаров не найдено. " +
          "Показываю запасной список товаров."
      );
      return finalize(FALLBACK_PRODUCTS);
    }
    return finalize(products);
  } catch (e) {
    console.error("Не удалось загрузить каталог из таблицы:", e);
    return finalize(FALLBACK_PRODUCTS);
  }
}
