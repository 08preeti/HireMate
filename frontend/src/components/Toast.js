import { useState, useEffect, useCallback } from "react";

// Global toast state
let addToastFn = null;

export function toast(message, type = "success", duration = 3000) {
  if (addToastFn) addToastFn(message, type, duration);
  else alert(message); // fallback if ToastProvider not mounted
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const colors = {
    success: { bg: "#f0fdf4", border: "#10b981", text: "#065f46" },
    error:   { bg: "#fef2f2", border: "#E8002A", text: "#991b1b" },
    info:    { bg: "#eff6ff", border: "#006491", text: "#1e40af" },
    warning: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
  };

  return (
    <>
      {children}
      <div style={{ position: "fixed", top: 70, right: 16, zIndex: 99999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320, width: "calc(100% - 32px)" }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.success;
          return (
            <div key={t.id} style={{
              background: c.bg, border: `1.5px solid ${c.border}`,
              borderRadius: 12, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,.12)",
              animation: "slideIn .3s ease",
              fontFamily: "sans-serif",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{icons[t.type]}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: c.text, lineHeight: 1.4 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }`}</style>
    </>
  );
}