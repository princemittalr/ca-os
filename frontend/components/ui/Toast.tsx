import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from "@/lib/utils"

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, type, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [message, onDismiss, duration]);

  const colors = {
    success: 'border-l-emerald-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500',
  };
  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle size={18} className="text-red-500 flex-shrink-0" />,
    warning: <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />,
    info: <Info size={18} className="text-blue-500 flex-shrink-0" />,
  };

  return (
    <div className={cn(
      "fixed bottom-8 right-8 z-[200] bg-white border border-[#E2E8F0] border-l-4",
      colors[type],
      "px-5 py-3.5 rounded-lg shadow-elevated max-w-sm flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300"
    )}>
      {icons[type]}
      <span className="text-[13px] font-medium text-[#0F172A] flex-1">{message}</span>
      <button onClick={onDismiss} className="text-slate-400 hover:text-slate-700 ml-2">
        <X size={16} />
      </button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const showToast = React.useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  const dismiss = React.useCallback(() => setToast(null), []);

  const ToastComponent = toast ? (
    <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />
  ) : null;

  return { showToast, ToastComponent };
}
