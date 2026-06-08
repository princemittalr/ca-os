import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, type, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [message, onDismiss, duration]);

  const colors = {
    success: 'border-l-[#10B981] text-slate-800',
    error: 'border-l-[#B91C1C] text-slate-800',
    warning: 'border-l-[#B45309] text-slate-800',
  };
  const icons = {
    success: <CheckCircle2 size={16} className="text-[#10B981] flex-shrink-0" />,
    error: <AlertCircle size={16} className="text-[#B91C1C] flex-shrink-0" />,
    warning: <AlertCircle size={16} className="text-[#B45309] flex-shrink-0" />,
  };

  return (
    <div className={`
      fixed bottom-8 right-8 z-[200] bg-white border border-slate-200 border-l-4 
      ${colors[type]} px-5 py-3.5 rounded-[4px] shadow-lg max-w-sm 
      flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 
    `}>
      {icons[type]}
      <span className="text-[12px] font-semibold flex-1">{message}</span>
      <button onClick={onDismiss} className="text-slate-400 hover:text-slate-700 ml-2">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = React.useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  }, []);

  const dismiss = React.useCallback(() => setToast(null), []);

  const ToastComponent = toast ? (
    <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />
  ) : null;

  return { showToast, ToastComponent };
}
