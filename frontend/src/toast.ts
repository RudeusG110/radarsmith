import { createContext, useContext } from "react";

export type ToastVariant = "success" | "error";

export interface ToastContextValue {
    showToast: (message: string, variant: ToastVariant) => void;
}

export const TOAST_DURATION_MS = 4000;

// No-op default: lets components call useToast() in tests that render them without a ToastProvider.
export const ToastContext = createContext<ToastContextValue>({ showToast: () => undefined });

export function useToast(): ToastContextValue {
    return useContext(ToastContext);
}
