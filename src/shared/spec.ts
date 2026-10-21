export const SIZES = [16, 24, 32, 48, 64] as const;
export type GridSize = (typeof SIZES)[number];

export const PALETTE_IDS = ["pico8", "gameboy", "nes", "custom"] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export const PIXEL_ALPHABET =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_";
export const TRANSPARENT = ".";
export const MAX_COLORS = PIXEL_ALPHABET.length;
export const CUSTOM_SLOTS = 16;
export const UNITS_PER_PIXEL = 8;

export type Palette = { id: PaletteId; colors: string[] };

export type PixelSpec = {
    size: GridSize;
    palette: Palette;
    /** size × size characters, row-major: "." is transparent, any other is an index into PIXEL_ALPHABET. */
    pixels: string;
};

export type Settings = {
    size: GridSize;
    palette: PaletteId;
    custom: string[];
};

const HEX = /^#[0-9a-f]{6}$/i;
const PIXELS = /^[0-9a-zA-Z_.-]*$/;

export const placedWidth = (size: GridSize): number => size * UNITS_PER_PIXEL;

export function encodePixels(grid: Int8Array): string {
    let out = "";
    for (const value of grid) {
        out += value < 0 ? TRANSPARENT : PIXEL_ALPHABET[value];
    }
    return out;
}

/** −1 is transparent; characters outside the alphabet read as transparent too. */
export function decodePixels(s: string, size: number): Int8Array {
    const grid = new Int8Array(size * size).fill(-1);
    for (let i = 0; i < grid.length && i < s.length; i++) {
        grid[i] = PIXEL_ALPHABET.indexOf(s[i]);
    }
    return grid;
}

function oneOf<T>(list: readonly T[], value: unknown, fallback: T): T {
    return list.includes(value as T) ? (value as T) : fallback;
}

const isHex = (value: unknown): value is string =>
    typeof value === "string" && HEX.test(value);

export function normalisePalette(raw: unknown): Palette | null {
    if (typeof raw !== "object" || raw === null) return null;
    const got = raw as Record<string, unknown>;
    if (!PALETTE_IDS.includes(got.id as PaletteId)) return null;
    const colors = got.colors;
    if (
        !Array.isArray(colors) ||
        colors.length < 1 ||
        colors.length > MAX_COLORS ||
        !colors.every(isHex)
    ) {
        return null;
    }
    return {
        id: got.id as PaletteId,
        colors: colors.map((c: string) => c.toLowerCase()),
    };
}

export function normaliseSpec(raw: unknown): PixelSpec | null {
    if (typeof raw !== "object" || raw === null) return null;
    const got = raw as Record<string, unknown>;
    if (!SIZES.includes(got.size as GridSize)) return null;
    const size = got.size as GridSize;
    const palette = normalisePalette(got.palette);
    const pixels = got.pixels;
    if (
        !palette ||
        typeof pixels !== "string" ||
        pixels.length !== size * size ||
        !PIXELS.test(pixels)
    ) {
        return null;
    }
    let painted = false;
    for (const ch of pixels) {
        if (ch === TRANSPARENT) continue;
        if (PIXEL_ALPHABET.indexOf(ch) >= palette.colors.length) return null;
        painted = true;
    }
    return painted ? { size, palette, pixels } : null;
}

export function normaliseSettings(raw: unknown, defaults: Settings): Settings {
    const got =
        typeof raw === "object" && raw !== null
            ? (raw as Record<string, unknown>)
            : {};
    const custom = defaults.custom.map((fallback, i) => {
        const value = Array.isArray(got.custom) ? got.custom[i] : undefined;
        return isHex(value) ? value.toLowerCase() : fallback;
    });
    return {
        size: oneOf(SIZES, got.size, defaults.size),
        palette: oneOf(PALETTE_IDS, got.palette, defaults.palette),
        custom,
    };
}
