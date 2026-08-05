import { useRef, useState } from "react";

import { toErrorMessage } from "../api/errors";
import { updateBlip, type Blip, type BlipPatch, type Quadrant, type Ring } from "../api/radars";
import { titleCase } from "../format";
import { Dialog } from "./Dialog";
import { useToast } from "../toast";

interface EditBlipDrawerProps {
    radarId: string;
    blip: Blip;
    quadrants: Quadrant[];
    rings: Ring[];
    onSaved: (blip: Blip) => void;
    onCancel: () => void;
}

export function EditBlipDrawer({ radarId, blip, quadrants, rings, onSaved, onCancel }: EditBlipDrawerProps) {
    const [name, setName] = useState(blip.name);
    const [description, setDescription] = useState(blip.description);
    const [quadrantId, setQuadrantId] = useState(blip.quadrant_id);
    const [ringId, setRingId] = useState(blip.ring_id);
    const [nameError, setNameError] = useState<string | null>(null);
    const [descriptionError, setDescriptionError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
    const submitErrorRef = useRef<HTMLParagraphElement>(null);
    const { showToast } = useToast();

    const nameChanged = name !== blip.name;
    const descriptionChanged = description !== blip.description;
    const quadrantChanged = quadrantId !== blip.quadrant_id;
    const ringChanged = ringId !== blip.ring_id;
    const isDirty = nameChanged || descriptionChanged || quadrantChanged || ringChanged;

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const trimmedName = name.trim();
        const trimmedDescription = description.trim();
        if (nameChanged && trimmedName === "") {
            setNameError("Name is required.");
            nameInputRef.current?.focus();
            return;
        }
        if (descriptionChanged && trimmedDescription === "") {
            setDescriptionError("Description is required.");
            descriptionInputRef.current?.focus();
            return;
        }
        setNameError(null);
        setDescriptionError(null);
        setSubmitError(null);
        setSubmitting(true);

        const patch: BlipPatch = {
            ...(nameChanged && { name: trimmedName }),
            ...(descriptionChanged && { description: trimmedDescription }),
            ...(quadrantChanged && { quadrant_id: quadrantId }),
            ...(ringChanged && { ring_id: ringId }),
        };

        try {
            const updated = await updateBlip(radarId, blip.id, patch);
            showToast(`Blip "${updated.name}" updated.`, "success");
            onSaved(updated);
        } catch (error) {
            setSubmitting(false);
            setSubmitError(toErrorMessage(error, "Failed to save blip."));
            queueMicrotask(() => submitErrorRef.current?.focus());
        }
    }

    return (
        <Dialog titleId="edit-blip-title" title="Edit blip" onClose={onCancel} className="dialog--form">
            <form aria-busy={submitting} onSubmit={(event) => void handleSubmit(event)}>
                <div>
                    <label htmlFor="edit-blip-name">Name</label>
                    <input
                        id="edit-blip-name"
                        ref={nameInputRef}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        aria-invalid={nameError !== null}
                        aria-describedby={nameError !== null ? "edit-blip-name-error" : undefined}
                        disabled={submitting}
                    />
                    {nameError !== null && (
                        <p id="edit-blip-name-error" role="alert">
                            {nameError}
                        </p>
                    )}
                </div>
                <div className="field-row">
                    <div>
                        <label htmlFor="edit-blip-quadrant">Quadrant</label>
                        <select id="edit-blip-quadrant" value={quadrantId} onChange={(event) => setQuadrantId(event.target.value)} disabled={submitting}>
                            {quadrants.map((quadrant) => (
                                <option key={quadrant.id} value={quadrant.id}>
                                    {titleCase(quadrant.name)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="edit-blip-ring">Ring</label>
                        <select id="edit-blip-ring" value={ringId} onChange={(event) => setRingId(event.target.value)} disabled={submitting}>
                            {rings.map((ring) => (
                                <option key={ring.id} value={ring.id}>
                                    {titleCase(ring.name)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="edit-blip-description">Description</label>
                    <textarea
                        id="edit-blip-description"
                        ref={descriptionInputRef}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        aria-invalid={descriptionError !== null}
                        aria-describedby={descriptionError !== null ? "edit-blip-description-error" : undefined}
                        disabled={submitting}
                        rows={6}
                    />
                    {descriptionError !== null && (
                        <p id="edit-blip-description-error" role="alert">
                            {descriptionError}
                        </p>
                    )}
                </div>
                {submitError !== null && (
                    <p role="alert" tabIndex={-1} ref={submitErrorRef}>
                        {submitError}
                    </p>
                )}
                <div className="form-actions">
                    <button type="submit" className="btn primary" disabled={!isDirty || submitting}>
                        {submitting ? "Saving…" : "Save"}
                    </button>
                    <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
                        Cancel
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
