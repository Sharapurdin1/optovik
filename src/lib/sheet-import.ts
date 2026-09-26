import "server-only";

// Источник для РАЗОВОГО импорта каталога в базу (кнопка в /manage/products).
//
// Раньше магазин читал товары прямо из Google-таблицы. Теперь каталог живёт
// в базе и ведётся в админке, а таблица нужна только, чтобы перенести
// товары один раз. Ссылка на опубликованный CSV — в SHEET_CSV_URL.
// Если ссылки нет или таблица не читается — берём стартовый список.
//
// Ожидаемые колонки таблицы (первая строка — заголовки, порядок любой):
//   Название | Категория | Цена | Единица | Старая цена | Хит | Наличие | Эмодзи

import {
  SEED_CATEGORIES as MASTER_CATEGORIES,
  SEED_PRODUCTS,
  type SeedProduct,
  type Category,
} from "./products";

export type SheetCatalog = {
  source: "sheet" | "seed";
  products: SeedProduct[];
  categories: Category[];
};

// Категория для товаров, чья «Категория» не совпала ни с одной известной.
const OTHER: Category = { id: "other", title: "Другое", emoji: "📦" };

// Оставляем только те категории, в которых есть товары (в исходном порядке),
// и добавляем «Другое», если такие товары есть.
function finalize(
  source: SheetCatalog["source"],
  products: SeedProduct[]
): SheetCatalog {
  const present = new Set(products.map((p) => p.categoryId));
  const categories = MASTER_CATEGORIES.filter((c) => present.has(c.id));
  if (present.has(OTHER.id)) categories.push(OTHER);
  return { source, products, categories };
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
export function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function categoryEmoji(id: string): string {
  return MASTER_CATEGORIES.find((c) => c.id === id)?.emoji ?? "🛒";
}

function rowsToProducts(rows: string[][]): SeedProduct[] {
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
    throw new Error(
      `В таблице не найдены колонки ${missing}. ` +
        `Проверьте первую строку с заголовками (Название, Категория, Цена, ...).`
    );
  }

  const titleToCategory = new Map(
    MASTER_CATEGORIES.map((c) => [c.title.trim().toLowerCase(), c.id])
  );

  const usedIds = new Set<string>();
  const out: SeedProduct[] = [];

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

export async function loadSheetCatalog(): Promise<SheetCatalog> {
  const url = process.env.SHEET_CSV_URL;
  if (!url) return finalize("seed", SEED_PRODUCTS);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Google-таблица не открылась (HTTP ${res.status})`);
  const products = rowsToProducts(parseCSV(await res.text()));
  if (products.length === 0) {
    throw new Error(
      "В таблице не нашлось товаров: проверьте заголовки (Название, Цена, …)"
    );
  }
  return finalize("sheet", products);
}
