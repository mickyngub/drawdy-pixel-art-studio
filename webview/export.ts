const EXPORT_SIDE = 1024;

export type EncodedImage = {
    dataUrl: string;
    pixelWidth: number;
    pixelHeight: number;
};

export type Rgb = [number, number, number];

/** Whole image pixels per grid cell, so the export comes as close to 1024 px as it can without blurring. */
export function exportScale(size: number): number {
    return Math.floor(EXPORT_SIDE / size);
}

export function hexRgb(hex: string): Rgb {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** One canvas pixel per cell; an empty cell takes `empty(x, y)` or stays clear. */
export function cellCanvas(
    grid: Int8Array,
    size: number,
    colors: readonly string[],
    empty?: (x: number, y: number) => Rgb
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const image = ctx.createImageData(size, size);
    const rgbs = colors.map(hexRgb);
    for (let i = 0; i < grid.length; i++) {
        const value = grid[i];
        const rgb =
            value >= 0 ? rgbs[value] : empty?.(i % size, Math.floor(i / size));
        if (!rgb) continue;
        image.data.set(rgb, i * 4);
        image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
}

export function exportPng(
    grid: Int8Array,
    size: number,
    colors: readonly string[]
): EncodedImage {
    const side = size * exportScale(size);
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cellCanvas(grid, size, colors), 0, 0, side, side);
    return {
        dataUrl: canvas.toDataURL("image/png"),
        pixelWidth: side,
        pixelHeight: side,
    };
}
