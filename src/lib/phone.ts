// Работа с номером телефона — общий код для сервера и браузера.

/** Приводит ввод к виду +7XXXXXXXXXX (11 цифр). Возвращает null, если номер неполный. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && (digits[0] === "8" || digits[0] === "7")) {
    digits = "7" + digits.slice(1);
  } else if (digits.length === 10) {
    digits = "7" + digits;
  } else {
    return null;
  }
  return "+" + digits;
}

/**
 * Живая «маска» для поля ввода: из любого ввода собирает номер в виде
 * +7 (900) 123-45-67, подставляя разделители по мере набора цифр.
 */
export function formatPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1); // 8… → 7…
  if (!d.startsWith("7")) d = "7" + d; // всегда начинаем с 7
  const rest = d.slice(1, 11); // до 10 цифр номера

  let out = "+7";
  if (rest.length > 0) out += " (" + rest.slice(0, 3);
  if (rest.length >= 3) out += ")";
  if (rest.length > 3) out += " " + rest.slice(3, 6);
  if (rest.length > 6) out += "-" + rest.slice(6, 8);
  if (rest.length > 8) out += "-" + rest.slice(8, 10);
  return out;
}

/** Красивый показ номера: +7 (999) 123-45-67 */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length !== 11) return phone;
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}
