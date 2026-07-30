import { useRef, useState } from "react";

import { toErrorMessage } from "../api/errors";
import { createRadar, type RadarDetail } from "../api/radars";

interface NewRadarFormProps {
    onCreated: (radar: RadarDetail) => void;
    onCancel: () => void;
}

export function NewRadarForm({ onCreated, onCancel }: NewRadarFormProps) {
    const [name, setName] = useState("");
    const [purpose, setPurpose] = useState("");
    const [nameError, setNameError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const submitErrorRef = useRef<HTMLParagraphElement>(null);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const trimmedName = name.trim();
        if (trimmedName === "") {
            setNameError("Name is required.");
            nameInputRef.current?.focus();
            return;
        }
        setNameError(null);
        setSubmitError(null);
        setSubmitting(true);

        try {
            const radar = await createRadar({
                name: trimmedName,
                purpose: purpose.trim() || undefined,
            });
            onCreated(radar);
        } catch (error) {
            setSubmitting(false);
            setSubmitError(toErrorMessage(error, "Failed to create radar."));
            // Deferred so the alert exists in the DOM before we try to focus it.
            queueMicrotask(() => submitErrorRef.current?.focus());
        }
    }

    return (
        <form aria-label="New radar" aria-busy={submitting} onSubmit={(event) => void handleSubmit(event)}>
            <div>
                <label htmlFor="new-radar-name">Name</label>
                <input
                    id="new-radar-name"
                    ref={nameInputRef}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={nameError !== null}
                    aria-describedby={nameError !== null ? "new-radar-name-error" : undefined}
                    disabled={submitting}
                />
                {nameError !== null && (
                    <p id="new-radar-name-error" role="alert">
                        {nameError}
                    </p>
                )}
            </div>
            <div>
                <label htmlFor="new-radar-purpose">Purpose (optional)</label>
                <input
                    id="new-radar-purpose"
                    value={purpose}
                    onChange={(event) => setPurpose(event.target.value)}
                    disabled={submitting}
                />
            </div>
            {submitError !== null && (
                <p role="alert" tabIndex={-1} ref={submitErrorRef}>
                    {submitError}
                </p>
            )}
            <button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create radar"}
            </button>
            <button type="button" onClick={onCancel} disabled={submitting}>
                Cancel
            </button>
        </form>
    );
}
