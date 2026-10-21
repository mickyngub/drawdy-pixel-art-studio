import { CUSTOM_SLOTS, type PaletteId } from "../../src/shared/spec";
import { hexRgb } from "../export";

export type FixedPaletteId = Exclude<PaletteId, "custom">;

// NES is Lospec's "nintendo-entertainment-system" list, copied as published.
export const PALETTES: Record<FixedPaletteId, readonly string[]> = {
    pico8: [
        "#000000",
        "#1d2b53",
        "#7e2553",
        "#008751",
        "#ab5236",
        "#5f574f",
        "#c2c3c7",
        "#fff1e8",
        "#ff004d",
        "#ffa300",
        "#ffec27",
        "#00e436",
        "#29adff",
        "#83769c",
        "#ff77a8",
        "#ffccaa",
    ],
    gameboy: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
    nes: [
        "#000000",
        "#fcfcfc",
        "#f8f8f8",
        "#bcbcbc",
        "#7c7c7c",
        "#a4e4fc",
        "#3cbcfc",
        "#0078f8",
        "#0000fc",
        "#b8b8f8",
        "#6888fc",
        "#0058f8",
        "#0000bc",
        "#d8b8f8",
        "#9878f8",
        "#6844fc",
        "#4428bc",
        "#f8b8f8",
        "#f878f8",
        "#d800cc",
        "#940084",
        "#f8a4c0",
        "#f85898",
        "#e40058",
        "#a80020",
        "#f0d0b0",
        "#f87858",
        "#f83800",
        "#a81000",
        "#fce0a8",
        "#fca044",
        "#e45c10",
        "#881400",
        "#f8d878",
        "#f8b800",
        "#ac7c00",
        "#503000",
        "#d8f878",
        "#b8f818",
        "#00b800",
        "#007800",
        "#b8f8b8",
        "#58d854",
        "#00a800",
        "#006800",
        "#b8f8d8",
        "#58f898",
        "#00a844",
        "#005800",
        "#00fcfc",
        "#00e8d8",
        "#008888",
        "#004058",
        "#f8d8f8",
        "#787878",
    ],
};

export const PALETTE_NAMES: Record<PaletteId, string> = {
    pico8: "PICO-8",
    gameboy: "Game Boy",
    nes: "NES",
    custom: "Custom",
};

export const DEFAULT_CUSTOM: readonly string[] = PALETTES.pico8.slice(
    0,
    CUSTOM_SLOTS
);

export type Oklab = [number, number, number];

const linear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function srgbToOklab(hex: string): Oklab {
    const [r, g, b] = hexRgb(hex).map(linear);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

/** The palette index closest to `hex` by squared OKLab distance; the lower index wins a tie. */
export function nearestIndex(hex: string, palette: readonly string[]): number {
    const [L, a, b] = srgbToOklab(hex);
    let best = 0;
    let bestDistance = Infinity;
    palette.forEach((candidate, i) => {
        const [L2, a2, b2] = srgbToOklab(candidate);
        const distance = (L - L2) ** 2 + (a - a2) ** 2 + (b - b2) ** 2;
        if (distance < bestDistance) {
            best = i;
            bestDistance = distance;
        }
    });
    return best;
}

/** Every painted cell takes the new palette's nearest colour; transparent cells stay transparent. */
export function remapPixels(
    grid: Int8Array,
    from: readonly string[],
    to: readonly string[]
): Int8Array {
    const map = from.map((hex) => nearestIndex(hex, to));
    return grid.map((value) => (value < 0 ? value : (map[value] ?? -1)));
}
