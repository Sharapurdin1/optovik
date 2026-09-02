// Каталог товаров. Пока данные заданы прямо в коде (моки).
// Позже заменим на базу данных PostgreSQL.

export type Category = {
  id: string;
  title: string;
  emoji: string;
};

export type Product = {
  id: string;
  title: string;
  categoryId: string;
  price: number; // цена в рублях
  unit: string; // единица (шт, кг, л ...)
  emoji: string; // временная «картинка»
  hit?: boolean; // хит продаж — показываем наверху каталога
  oldPrice?: number; // старая цена (для показа скидки)
};

export const categories: Category[] = [
  { id: "fruits", title: "Овощи и фрукты", emoji: "🥦" },
  { id: "dairy", title: "Молочное", emoji: "🥛" },
  { id: "bakery", title: "Хлеб и выпечка", emoji: "🥖" },
  { id: "meat", title: "Мясо и птица", emoji: "🍗" },
  { id: "drinks", title: "Напитки", emoji: "🥤" },
  { id: "grocery", title: "Бакалея", emoji: "🍚" },
  { id: "snacks", title: "Снеки", emoji: "🍫" },
];

export const products: Product[] = [
  // Овощи и фрукты
  { id: "banana", title: "Бананы", categoryId: "fruits", price: 79, unit: "кг", emoji: "🍌", hit: true, oldPrice: 129 },
  { id: "apple", title: "Яблоки Голден", categoryId: "fruits", price: 149, unit: "кг", emoji: "🍎", hit: true },
  { id: "tomato", title: "Помидоры", categoryId: "fruits", price: 199, unit: "кг", emoji: "🍅" },
  { id: "cucumber", title: "Огурцы", categoryId: "fruits", price: 169, unit: "кг", emoji: "🥒" },
  { id: "potato", title: "Картофель", categoryId: "fruits", price: 45, unit: "кг", emoji: "🥔" },
  { id: "avocado", title: "Авокадо", categoryId: "fruits", price: 99, unit: "шт", emoji: "🥑" },

  // Молочное
  { id: "milk", title: "Молоко 3.2%", categoryId: "dairy", price: 59, unit: "1 л", emoji: "🥛", hit: true, oldPrice: 89 },
  { id: "cheese", title: "Сыр Российский", categoryId: "dairy", price: 289, unit: "300 г", emoji: "🧀", hit: true },
  { id: "butter", title: "Масло сливочное", categoryId: "dairy", price: 179, unit: "180 г", emoji: "🧈" },
  { id: "egg", title: "Яйца C1", categoryId: "dairy", price: 89, unit: "10 шт", emoji: "🥚", hit: true, oldPrice: 109 },

  // Хлеб и выпечка
  { id: "bread", title: "Хлеб белый", categoryId: "bakery", price: 49, unit: "шт", emoji: "🍞", hit: true },
  { id: "baguette", title: "Багет", categoryId: "bakery", price: 65, unit: "шт", emoji: "🥖" },
  { id: "croissant", title: "Круассан", categoryId: "bakery", price: 79, unit: "шт", emoji: "🥐" },

  // Мясо и птица
  { id: "chicken", title: "Филе куриное", categoryId: "meat", price: 349, unit: "кг", emoji: "🍗", hit: true },
  { id: "beef", title: "Говядина", categoryId: "meat", price: 649, unit: "кг", emoji: "🥩" },
  { id: "bacon", title: "Бекон", categoryId: "meat", price: 259, unit: "200 г", emoji: "🥓" },

  // Напитки
  { id: "water", title: "Вода питьевая", categoryId: "drinks", price: 39, unit: "1.5 л", emoji: "💧", hit: true },
  { id: "juice", title: "Сок апельсиновый", categoryId: "drinks", price: 119, unit: "1 л", emoji: "🧃" },
  { id: "cola", title: "Кола", categoryId: "drinks", price: 99, unit: "1 л", emoji: "🥤" },
  { id: "coffee", title: "Кофе молотый", categoryId: "drinks", price: 399, unit: "250 г", emoji: "☕" },

  // Бакалея
  { id: "rice", title: "Рис", categoryId: "grocery", price: 129, unit: "900 г", emoji: "🍚" },
  { id: "pasta", title: "Макароны", categoryId: "grocery", price: 89, unit: "450 г", emoji: "🍝" },
  { id: "sugar", title: "Сахар", categoryId: "grocery", price: 79, unit: "1 кг", emoji: "🧂" },
  { id: "oil", title: "Масло подсолнечное", categoryId: "grocery", price: 149, unit: "1 л", emoji: "🫒" },

  // Снеки
  { id: "chips", title: "Чипсы", categoryId: "snacks", price: 99, unit: "150 г", emoji: "🍟" },
  { id: "chocolate", title: "Шоколад", categoryId: "snacks", price: 89, unit: "90 г", emoji: "🍫" },
  { id: "cookies", title: "Печенье", categoryId: "snacks", price: 119, unit: "300 г", emoji: "🍪" },
  { id: "nuts", title: "Орехи микс", categoryId: "snacks", price: 199, unit: "200 г", emoji: "🥜" },
];

// Хиты продаж — показываем отдельным блоком наверху каталога.
export const hitProducts: Product[] = products.filter((p) => p.hit);

export function formatPrice(rub: number): string {
  return `${rub.toLocaleString("ru-RU")} ₽`;
}
