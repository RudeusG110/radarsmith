import { useCallback, useEffect, useRef, useState } from "react";

import { TOAST_DURATION_MS, ToastContext, type ToastVariant } from "../toast";

interface Toast {
    id: number;
    message: string;
    variant: ToastVariant;
}

interface ToastProviderProps {
    children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(0);
    const timeouts = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    useEffect(() => {
        const pending = timeouts.current;
        return () => {
            pending.forEach((timeout) => clearTimeout(timeout));
            pending.clear();
        };
    }, []);

    const showToast = useCallback((message: string, variant: ToastVariant) => {
        const id = nextId.current++;
        setToasts((current) => [...current, { id, message, variant }]);
        const timeout = setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
            timeouts.current.delete(id);
        }, TOAST_DURATION_MS);
        timeouts.current.set(id, timeout);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-viewport" role="status" aria-live="polite">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast toast--${toast.variant}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
