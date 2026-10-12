"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type AddToast = (message: string, type?: ToastType, duration?: number) => void;

// Global toast state
let addToastFn: AddToast | null = null;

export function toast(message: string, type: ToastType = "success", duration = 3000): void {
  if (addToastFn) addToastFn(message, type, duration);
  else alert(message); // fallback if ToastProvider not mounted
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback<AddToast>((message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const icons: Record<ToastType, string> = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  // Full class names (not built dynamically) so Tailwind can see them.
  const colors: Record<ToastType, { box: string; text: string }> = {
    success: { box: "bg-green-50 border-emerald-500", text: "text-emerald-800" },
    error:   { box: "bg-red-50 border-danger",        text: "text-red-800" },
    info:    { box: "bg-blue-50 border-brand",        text: "text-blue-800" },
    warning: { box: "bg-amber-50 border-amber-500",   text: "text-amber-800" },
  };

  return (
    <>
      {children}
      <div className="fixed top-[70px] right-4 z-[99999] flex flex-col gap-2 max-w-[320px] w-[calc(100%_-_32px)]">
        {toasts.map(t => {
          const c = colors[t.type] || colors.success;
          return (
            <div key={t.id} className={`rounded-xl border-[1.5px] py-3 px-4 flex items-center gap-2.5 shadow-[0_4px_16px_rgba(0,0,0,.12)] font-plain animate-slide-in ${c.box}`}>
              <span className="text-[18px] shrink-0">{icons[t.type]}</span>
              <span className={`text-[14px] font-semibold leading-[1.4] ${c.text}`}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}