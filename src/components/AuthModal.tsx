"use client";

import { useState } from "react";
import { useAuth, formatPhone, formatPhoneInput } from "@/lib/auth";

export function AuthModal() {
  const { isModalOpen, closeLogin, requestCode, verifyCode, saveName } =
    useAuth();

  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [nameInput, setNameInput] = useState("");
  // Сразу подставляем +7, чтобы клиенту оставалось ввести только номер.
  const [phoneInput, setPhoneInput] = useState("+7 ");
  const [normalized, setNormalized] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isModalOpen) return null;

  function reset() {
    setStep("phone");
    setPhoneInput("+7 ");
    setNormalized(null);
    setCodeInput("");
    setNameInput("");
    setDemoCode(null);
    setError(null);
    setBusy(false);
  }

  function handleClose() {
    reset();
    closeLogin();
  }

  async function handleSendCode() {
    if (busy) return;
    // Требуем полностью заполненный номер: +7 и все 10 цифр (итого 11).
    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length !== 11) {
      setError("Введите номер полностью — все 10 цифр после +7");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await requestCode(phoneInput);
    setBusy(false);
    if (!res.ok || !res.phone) {
      setError(res.error ?? "Не удалось отправить код");
      return;
    }
    setNormalized(res.phone);
    setDemoCode(res.demoCode ?? null); // код на экране только в демо-режиме
    setStep("code");
  }

  async function handleVerify() {
    if (busy || !normalized) return;
    setBusy(true);
    setError(null);
    const res = await verifyCode(normalized, codeInput.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Неверный код. Попробуйте ещё раз");
      return;
    }
    // Новый клиент — просим имя; иначе просто входим.
    if (res.needName) {
      setStep("name");
      return;
    }
    reset();
    closeLogin();
  }

  async function handleSaveName() {
    if (busy) return;
    if (!nameInput.trim()) {
      setError("Введите имя");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await saveName(nameInput.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Не удалось сохранить имя");
      return;
    }
    reset();
    closeLogin();
  }

  function skipName() {
    reset();
    closeLogin();
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
            <h2 className="text-xl font-bold mb-1">Вход или регистрация</h2>
            <p className="text-sm text-neutral-500 mb-4">
              Введите номер — пришлём код подтверждения
            </p>
            <input
              type="tel"
              inputMode="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
              placeholder="+7 (999) 123-45-67"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
              autoFocus
            />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            <button
              onClick={handleSendCode}
              disabled={busy}
              className="w-full mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 transition-colors disabled:opacity-60"
            >
              {busy ? "Отправляем…" : "Получить код"}
            </button>
          </>
        ) : step === "code" ? (
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
              disabled={busy}
              className="w-full mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 transition-colors disabled:opacity-60"
            >
              {busy ? "Проверяем…" : "Войти"}
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
        ) : (
          <>
            <h2 className="text-xl font-bold mb-1">Как вас зовут?</h2>
            <p className="text-sm text-neutral-500 mb-4">
              Имя нужно, чтобы курьер знал, к кому едет
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              placeholder="Например: Магомед"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
              autoFocus
            />
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            <button
              onClick={handleSaveName}
              disabled={busy}
              className="w-full mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 transition-colors disabled:opacity-60"
            >
              {busy ? "Сохраняем…" : "Готово"}
            </button>
            <button
              onClick={skipName}
              disabled={busy}
              className="w-full mt-2 text-sm text-neutral-500 hover:text-neutral-800 disabled:opacity-60"
            >
              Пропустить
            </button>
          </>
        )}
      </div>
    </div>
  );
}
