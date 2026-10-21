import assert from "node:assert/strict";
import { test } from "node:test";
import {
    bresenham,
    dropMissingColours,
    floodFill,
    mirrorX,
    resizeGrid,
} from "../webview/lib/tools";

const gridOf = (rows: string[]) =>
    new Int8Array(
        rows
            .join("")
            .split("")
            .map((ch) => (ch === "." ? -1 : Number(ch)))
    );
const rowsOf = (grid: Int8Array, size: number) =>
    Array.from({ length: size }, (_, y) =>
        [...grid.subarray(y * size, (y + 1) * size)]
            .map((v) => (v < 0 ? "." : String(v)))
            .join("")
    );

test("fill floods 4-connected cells of the start colour and stops at other colours", () => {
    const grid = gridOf(["..1.", ".1..", "1...", "...."]);
    assert.equal(floodFill(grid, 4, 0, 2), true);
    assert.deepEqual(rowsOf(grid, 4), ["221.", "21..", "1...", "...."]);
});

test("fill reaches the grid edges without wrapping to the next row", () => {
    const grid = gridOf(["...1", "1111", "....", "...."]);
    floodFill(grid, 4, 0, 3);
    assert.deepEqual(rowsOf(grid, 4), ["3331", "1111", "....", "...."]);
});

test("fill with the colour already there changes nothing", () => {
    const grid = gridOf(["11", "11"]);
    assert.equal(floodFill(grid, 2, 0, 1), false);
});

test("Bresenham includes both ends of shallow and steep lines, in either direction", () => {
    assert.deepEqual(bresenham(0, 0, 5, 1), [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 1],
        [4, 1],
        [5, 1],
    ]);
    assert.deepEqual(bresenham(1, 4, 0, 0), [
        [1, 4],
        [1, 3],
        [0, 2],
        [0, 1],
        [0, 0],
    ]);
    assert.deepEqual(bresenham(2, 2, 2, 2), [[2, 2]]);
    for (const [x0, y0, x1, y1] of [
        [0, 0, 7, 3],
        [7, 3, 0, 0],
        [3, 0, 0, 7],
        [5, 5, 5, 0],
    ]) {
        const line = bresenham(x0, y0, x1, y1);
        assert.deepEqual(line[0], [x0, y0]);
        assert.deepEqual(line.at(-1), [x1, y1]);
        assert.equal(
            line.length,
            Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1
        );
    }
});

test("mirror-X maps each cell to its reflection in the same row", () => {
    assert.equal(mirrorX(0, 16), 15);
    assert.equal(mirrorX(15, 16), 0);
    assert.equal(mirrorX(16 + 3, 16), 16 + 12);
    assert.equal(mirrorX(5 * 24 + 11, 24), 5 * 24 + 12);
    for (let i = 0; i < 32 * 32; i++) {
        assert.equal(mirrorX(mirrorX(i, 32), 32), i);
    }
});

test("resizing keeps the top-left corner, padding with transparency or cropping", () => {
    const grid = gridOf(["12", "34"]);
    assert.deepEqual(rowsOf(resizeGrid(grid, 2, 3), 3), ["12.", "34.", "..."]);
    const big = gridOf(["123", "456", "789"]);
    assert.deepEqual(rowsOf(resizeGrid(big, 3, 2), 2), ["12", "45"]);
});

test("cells past the new palette's length become transparent", () => {
    const grid = gridOf(["0369"]);
    assert.deepEqual([...dropMissingColours(grid, 4)], [0, 3, -1, -1]);
    assert.deepEqual([...grid], [0, 3, 6, 9]);
});
