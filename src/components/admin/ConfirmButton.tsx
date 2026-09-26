"use client";

// Кнопка с подтверждением прямо на месте: первый клик — «Точно?», второй —
// действие. Системные confirm()/alert() не используем: встроенные браузеры
// (Telegram, Instagram) и «запрет диалогов» молча их блокируют.

import { useEffect, useState, type ReactNode } from "react";

export function ConfirmButton({
  onConfirm,
  children,
  confirmText = "Точно?",
  className,
  disabled,
  title,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmText?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const [armed, setArmed] = useState(false);

  // Если не подтвердили за 4 секунды — возвращаем обычный вид.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      className={`${className ?? ""} ${armed ? "!bg-red-500 !text-white !border-red-500" : ""}`}
    >
      {armed ? confirmText : children}
    </button>
  );
}
