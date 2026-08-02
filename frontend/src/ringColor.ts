/** Derives a ring's hue from its order, not its identity, so any ring count/order works. */
function ringHue(index: number, ringCount: number): number {
    return ringCount <= 1 ? 140 : 140 - (140 * index) / (ringCount - 1);
}

/** Derives a marker color from a ring's order, not its identity, so any ring count/order works. */
export function ringColor(index: number, ringCount: number): string {
    return `hsl(${ringHue(index, ringCount)}, 65%, 55%)`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hPrime = h / 60;
    const x = c * (1 - Math.abs((hPrime % 2) - 1));
    const m = l - c / 2;
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
    if (hPrime < 1) [r1, g1, b1] = [c, x, 0];
    else if (hPrime < 2) [r1, g1, b1] = [x, c, 0];
    else if (hPrime < 3) [r1, g1, b1] = [0, c, x];
    else if (hPrime < 4) [r1, g1, b1] = [0, x, c];
    else if (hPrime < 5) [r1, g1, b1] = [x, 0, c];
    else[r1, g1, b1] = [c, 0, x];
    return [r1 + m, g1 + m, b1 + m];
}

/**
 * HSL "lightness" isn't perceived brightness across hues (e.g. a mid-lightness green reads much
 * brighter than a mid-lightness red), so a hardcoded white marker-number can wash out on some
 * rings. Pick white or the app's dark background color based on the ring color's actual luminance.
 */
export function ringTextColor(index: number, ringCount: number): string {
    const [r, g, b] = hslToRgb(ringHue(index, ringCount), 0.65, 0.55);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 0.6 ? "var(--bg)" : "#fff";
}
