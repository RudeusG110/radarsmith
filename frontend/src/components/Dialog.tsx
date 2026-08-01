import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
    titleId: string;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

/** Hand-rolled modal (focus trap + Escape + restore-focus-on-close): jsdom has no HTMLDialogElement support to test against. */
export function Dialog({ titleId, title, onClose, children, className }: DialogProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<Element | null>(null);

    useEffect(() => {
        triggerRef.current = document.activeElement;
        const focusable = rootRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        focusable?.[0]?.focus();

        return () => {
            if (triggerRef.current instanceof HTMLElement) {
                triggerRef.current.focus();
            }
        };
    }, []);

    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
            return;
        }

        if (event.key !== "Tab") {
            return;
        }

        const focusable = rootRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable === undefined || focusable.length === 0) {
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    return (
        <div className="dialog-backdrop">
            <div
                className={className === undefined ? "dialog" : `dialog ${className}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                ref={rootRef}
                onKeyDown={handleKeyDown}
            >
                <h2 id={titleId}>{title}</h2>
                {children}
            </div>
        </div>
    );
}
