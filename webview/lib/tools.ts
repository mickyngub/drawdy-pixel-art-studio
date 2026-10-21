export type Point = [number, number];

/** 4-connected flood from `start`; returns whether any cell changed. */
export function floodFill(
    grid: Int8Array,
    size: number,
    start: number,
    value: number
): boolean {
    const target = grid[start];
    if (target === value) return false;
    const stack = [start];
    while (stack.length > 0) {
        const i = stack.pop() as number;
        if (grid[i] !== target) continue;
        grid[i] = value;
        const x = i % size;
        if (x > 0) stack.push(i - 1);
        if (x < size - 1) stack.push(i + 1);
        if (i >= size) stack.push(i - size);
        if (i < size * (size - 1)) stack.push(i + size);
    }
    return true;
}

/** Every cell on the line, both ends included, in order from the first point. */
export function bresenham(
    x0: number,
    y0: number,
    x1: number,
    y1: number
): Point[] {
    const points: Point[] = [];
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
        points.push([x, y]);
        if (x === x1 && y === y1) return points;
        const e2 = 2 * err;
        if (e2 >= dy) {
            err += dy;
            x += sx;
        }
        if (e2 <= dx) {
            err += dx;
            y += sy;
        }
    }
}

/** The row-major index of the cell mirrored across the grid's vertical centre line. */
export function mirrorX(index: number, size: number): number {
    const x = index % size;
    return index - x + (size - 1 - x);
}

/** Crops or pads with transparency, keeping the top-left corner in place. */
export function resizeGrid(
    grid: Int8Array,
    from: number,
    to: number
): Int8Array {
    const out = new Int8Array(to * to).fill(-1);
    const keep = Math.min(from, to);
    for (let y = 0; y < keep; y++) {
        out.set(grid.subarray(y * from, y * from + keep), y * to);
    }
    return out;
}

/** Cells using an index the palette no longer has become transparent. */
export function dropMissingColours(grid: Int8Array, count: number): Int8Array {
    return grid.map((value) => (value >= count ? -1 : value));
}
