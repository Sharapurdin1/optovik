// Работа с номером телефона — общий код для сервера и браузера.

/** Приводит ввод к виду +7XXXXXXXXXX (11 цифр). Возвращает null, если номер неполный. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  // «+…» — код страны уже набран: после +7 нужны ровно 10 цифр
  // (иначе неполный «+7 999 123 45 6» сошёл бы за номер без кода).
  if (input.trim().startsWith("+")) {
    return digits.length === 11 && digits[0] === "7" ? "+" + digits : null;
  }
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
 * +7 999 999 99 99. «+7 » стоит всегда, лишние символы отбрасываются,
 * 8… в начале превращается в +7…
 */
export function formatPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1); // вставили 8 999…
  if (!d.startsWith("7") || d.length <= 10) {
    // Набирают без кода страны (999…) или «+7 » уже стоит в поле.
    d = d.startsWith("7") ? d : "7" + d;
  }
  const rest = d.slice(1, 11); // до 10 цифр номера

  let out = "+7 " + rest.slice(0, 3);
  if (rest.length > 3) out += " " + rest.slice(3, 6);
  if (rest.length > 6) out += " " + rest.slice(6, 8);
  if (rest.length > 8) out += " " + rest.slice(8, 10);
  return out;
}

/** Полный ли номер: ровно 10 цифр после +7. */
export function isCompletePhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** Красивый показ номера: +7 999 999 99 99 */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length !== 11) return phone;
  return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}
