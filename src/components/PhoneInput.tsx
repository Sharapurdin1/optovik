"use client";

// Поле телефона с маской +7 999 999 99 99.
// «+7 » стоит всегда, курсор при нажатии встаёт в конец номера, вводятся
// только цифры (на букву — подсказка). Неполный номер подсвечивается,
// когда человек уходит с поля или пытается отправить форму (invalid).

import { useRef, useState } from "react";
import { formatPhoneInput, isCompletePhone } from "@/lib/phone";

export function PhoneInput({
  value,
  onChange,
  invalid = false,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean; // форма отправлена с неполным номером
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState(false);
  const [lettersHint, setLettersHint] = useState(false);

  // Курсор — всегда после набранных цифр (не внутри «+7 »).
  const caretToEnd = () => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const end = el.value.length;
      el.setSelectionRange(end, end);
    });
  };

  const hasDigits = value.replace(/\D/g, "").length > 1;
  const showError = (invalid || (touched && hasDigits)) && !isCompletePhone(value);

  return (
    <div>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={value || "+7 "}
        onFocus={() => {
          if (!value) onChange("+7 ");
          caretToEnd();
        }}
        onClick={caretToEnd}
        onChange={(e) => {
          // Буквы и прочие символы маска выбросит — подскажем почему.
          setLettersHint(/[^\d\s+()-]/.test(e.target.value));
          onChange(formatPhoneInput(e.target.value));
        }}
        onBlur={() => setTouched(true)}
        placeholder="+7 999 999 99 99"
        aria-invalid={showError}
        className={`${className} ${showError ? "!border-red-400 bg-red-50/40" : ""}`}
      />
      {showError ? (
        <p className="text-xs text-red-500 mt-1">
          Проверьте номер: нужно 10 цифр после +7, например +7 999 123 45 67
        </p>
      ) : lettersHint ? (
        <p className="text-xs text-amber-600 mt-1">В номере только цифры</p>
      ) : null}
    </div>
  );
}
