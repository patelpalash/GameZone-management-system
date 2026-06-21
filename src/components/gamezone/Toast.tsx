"use client";

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: "border-green-500 bg-green-950/90 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]",
  error: "border-red-500 bg-red-950/90 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]",
  info: "border-cyan-500 bg-cyan-950/90 text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = TOAST_ICONS[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border backdrop-blur-md font-mono text-sm tracking-wider cyber-cut animate-slide-in-right ${TOAST_STYLES[toast.type]}`}
      role="alert"
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 font-bold uppercase text-xs">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-0.5 hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
