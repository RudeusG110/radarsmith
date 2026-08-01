/** Derives a marker color from a ring's order, not its identity, so any ring count/order works. */
export function ringColor(index: number, ringCount: number): string {
    const hue = ringCount <= 1 ? 140 : 140 - (140 * index) / (ringCount - 1);
    return `hsl(${hue}, 65%, 55%)`;
}
