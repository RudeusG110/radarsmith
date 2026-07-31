import { useRef, useState } from "react";

import { toErrorMessage } from "../api/errors";
import { createBlip, type Blip, type Quadrant, type Ring } from "../api/radars";
import { titleCase } from "../format";
import { Dialog } from "./Dialog";

interface AddBlipDrawerProps {
    radarId: string;
    quadrants: Quadrant[];
    rings: Ring[];
    onCreated: (blip: Blip) => void;
    onCancel: () => void;
}

export function AddBlipDrawer({ radarId, quadrants, rings, onCreated, onCancel }: AddBlipDrawerProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [quadrantId, setQuadrantId] = useState(quadrants[0]?.id ?? "");
    const [ringId, setRingId] = useState(rings[0]?.id ?? "");
    const [nameError, setNameError] = useState<string | null>(null);
    const [descriptionError, setDescriptionError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
    const submitErrorRef = useRef<HTMLParagraphElement>(null);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        const trimmedName = name.trim();
        const trimmedDescription = description.trim();
        if (trimmedName === "") {
            setNameError("Name is required.");
            nameInputRef.current?.focus();
            return;
        }
        if (trimmedDescription === "") {
            setDescriptionError("Description is required.");
            descriptionInputRef.current?.focus();
            return;
        }
        setNameError(null);
        setDescriptionError(null);
        setSubmitError(null);
        setSubmitting(true);

        try {
            const blip = await createBlip(radarId, {
                name: trimmedName,
                description: trimmedDescription,
                quadrant_id: quadrantId,
                ring_id: ringId,
            });
            onCreated(blip);
        } catch (error) {
            setSubmitting(false);
            setSubmitError(toErrorMessage(error, "Failed to add blip."));
            queueMicrotask(() => submitErrorRef.current?.focus());
        }
    }

    return (
        <Dialog titleId="add-blip-title" title="Add blip" onClose={onCancel}>
            <form aria-busy={submitting} onSubmit={(event) => void handleSubmit(event)}>
                <div>
                    <label htmlFor="add-blip-name">Name</label>
                    <input
                        id="add-blip-name"
                        ref={nameInputRef}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        aria-invalid={nameError !== null}
                        aria-describedby={nameError !== null ? "add-blip-name-error" : undefined}
                        disabled={submitting}
                    />
                    {nameError !== null && (
                        <p id="add-blip-name-error" role="alert">
                            {nameError}
                        </p>
                    )}
                </div>
                <div>
                    <label htmlFor="add-blip-description">Description</label>
                    <textarea
                        id="add-blip-description"
                        ref={descriptionInputRef}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        aria-invalid={descriptionError !== null}
                        aria-describedby={descriptionError !== null ? "add-blip-description-error" : undefined}
                        disabled={submitting}
                    />
                    {descriptionError !== null && (
                        <p id="add-blip-description-error" role="alert">
                            {descriptionError}
                        </p>
                    )}
                </div>
                <div>
                    <label htmlFor="add-blip-quadrant">Quadrant</label>
                    <select id="add-blip-quadrant" value={quadrantId} onChange={(event) => setQuadrantId(event.target.value)} disabled={submitting}>
                        {quadrants.map((quadrant) => (
                            <option key={quadrant.id} value={quadrant.id}>
                                {titleCase(quadrant.name)}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="add-blip-ring">Ring</label>
                    <select id="add-blip-ring" value={ringId} onChange={(event) => setRingId(event.target.value)} disabled={submitting}>
                        {rings.map((ring) => (
                            <option key={ring.id} value={ring.id}>
                                {titleCase(ring.name)}
                            </option>
                        ))}
                    </select>
                </div>
                {submitError !== null && (
                    <p role="alert" tabIndex={-1} ref={submitErrorRef}>
                        {submitError}
                    </p>
                )}
                <button type="submit" disabled={submitting}>
                    {submitting ? "Adding…" : "Add blip"}
                </button>
                <button type="button" onClick={onCancel} disabled={submitting}>
                    Cancel
                </button>
            </form>
        </Dialog>
    );
}
