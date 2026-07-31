/** Renders backend enum values ("ADOPT", "LANGUAGES & FRAMEWORKS") as title case. */
export function titleCase(value: string): string {
    return value
        .toLowerCase()
        .split(" ")
        .map((word) => (word === "&" ? word : word.charAt(0).toUpperCase() + word.slice(1)))
        .join(" ");
}
