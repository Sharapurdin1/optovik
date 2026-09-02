"use client";

import { useState } from "react";
import { useAuth, normalizePhone, formatPhone } from "@/lib/auth";

export function AuthModal() {
  const { isModalOpen, closeLogin, requestCode, verifyCode } = useAuth();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [normalized, setNormalized] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isModalOpen) return null;

  function reset() {
    setStep("phone");
    setPhoneInput("");
    setNormalized(null);
    setCodeInput("");
    setDemoCode(null);
    setError(null);
  }

  function handleClose() {
    reset();
    closeLogin();
  }

  function handleSendCode() {
    const phone = normalizePhone(phoneInput);
    if (!phone) {
      setError("Введите корректный номер телефона");
      return;
    }
    setNormalized(phone);
    const code = requestCode(phone);
    setDemoCode(code); // демо: показываем код на экране
    setStep("code");
    setError(null);
  }

  function handleVerify() {
    if (!normalized) return;
    const ok = verifyCode(normalized, codeInput.trim());
    if (!ok) {
      setError("Неверный код. Попробуйте ещё раз");
      return;
    }
    reset();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* затемнение */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* окно */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 text-2xl leading-none"
          aria-label="Закрыть"
        >
          ×
        </button>

        {step === "phone" ? (
          <>
            <h2 className="text-xl font-bold mb-1">Вход по телефону</h2>
            <p className="text-sm text-neutral-500 mb-4">
              Введите номер — пришлём код подтверждения
            </p>
            <input
              type="tel"
              inputMode="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
              placeholder="+7 (999) 123-45-67"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
              autoFocus
            />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            <button
              onClick={handleSendCode}
              className="w-full mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 transition-colors"
            >
              Получить код
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-1">Введите код</h2>
            <p className="text-sm text-neutral-500 mb-4">
              Код отправлен на {normalized && formatPhone(normalized)}
            </p>

            {demoCode && (
              <div className="mb-4 rounded-lg bg-amber-50 text-amber-800 text-sm px-3 py-2">
                Демо-режим: ваш код <b className="tabular-nums">{demoCode}</b>
                <br />
                (в рабочей версии он придёт в SMS)
              </div>
            )}

            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder="1234"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-center text-2xl tracking-[0.5em] tabular-nums outline-none focus:border-emerald-500 transition-colors"
              autoFocus
            />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            <button
              onClick={handleVerify}
              className="w-full mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 transition-colors"
            >
              Войти
            </button>
            <button
              onClick={() => {
                setStep("phone");
                setError(null);
                setCodeInput("");
              }}
              className="w-full mt-2 text-sm text-neutral-500 hover:text-neutral-800"
            >
              Изменить номер
            </button>
          </>
        )}
      </div>
    </div>
  );
}
