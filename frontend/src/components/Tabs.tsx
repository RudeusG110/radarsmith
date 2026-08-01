import { useRef } from "react";

export interface TabItem {
    id: string;
    label: string;
}

export interface TabsProps {
    label: string;
    tabs: TabItem[];
    activeId: string;
    onChange: (id: string) => void;
}

/** WAI-ARIA APG tabs (automatic activation): roving tabindex + arrow-key navigation. */
export function Tabs({ label, tabs, activeId, onChange }: TabsProps) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    function focusAndActivate(index: number) {
        const wrapped = (index + tabs.length) % tabs.length;
        onChange(tabs[wrapped].id);
        tabRefs.current[wrapped]?.focus();
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
        if (event.key === "ArrowRight") {
            event.preventDefault();
            focusAndActivate(index + 1);
        } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            focusAndActivate(index - 1);
        } else if (event.key === "Home") {
            event.preventDefault();
            focusAndActivate(0);
        } else if (event.key === "End") {
            event.preventDefault();
            focusAndActivate(tabs.length - 1);
        }
    }

    return (
        <div role="tablist" aria-label={label}>
            {tabs.map((tab, index) => {
                const isActive = tab.id === activeId;
                return (
                    <button
                        key={tab.id}
                        ref={(element) => {
                            tabRefs.current[index] = element;
                        }}
                        type="button"
                        id={`${tab.id}-tab`}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`${tab.id}-panel`}
                        tabIndex={isActive ? 0 : -1}
                        className={isActive ? "tab active" : "tab"}
                        onClick={() => onChange(tab.id)}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
