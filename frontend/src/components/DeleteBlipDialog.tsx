import { useRef, useState } from "react";

import { toErrorMessage } from "../api/errors";
import { deleteBlip, type Blip } from "../api/radars";
import { Dialog } from "./Dialog";
import { useToast } from "../toast";

interface DeleteBlipDialogProps {
    radarId: string;
    blip: Blip;
    onDeleted: (blipId: string) => void;
    onCancel: () => void;
}

export function DeleteBlipDialog({ radarId, blip, onDeleted, onCancel }: DeleteBlipDialogProps) {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const submitErrorRef = useRef<HTMLParagraphElement>(null);
    const { showToast } = useToast();

    async function handleDelete() {
        setSubmitError(null);
        setSubmitting(true);

        try {
            await deleteBlip(radarId, blip.id);
            showToast(`Blip "${blip.name}" deleted.`, "success");
            onDeleted(blip.id);
        } catch (error) {
            setSubmitting(false);
            setSubmitError(toErrorMessage(error, "Failed to delete blip."));
            queueMicrotask(() => submitErrorRef.current?.focus());
        }
    }

    return (
        <Dialog titleId="delete-blip-title" title="Delete blip" onClose={onCancel}>
            <p>
                Delete <strong>{blip.name}</strong>? This cannot be undone.
            </p>
            {submitError !== null && (
                <p role="alert" tabIndex={-1} ref={submitErrorRef}>
                    {submitError}
                </p>
            )}
            <button type="button" className="btn danger" onClick={() => void handleDelete()} disabled={submitting}>
                {submitting ? "Deleting…" : "Delete"}
            </button>
            <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
                Cancel
            </button>
        </Dialog>
    );
}
