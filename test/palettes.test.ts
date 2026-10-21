import assert from "node:assert/strict";
import { test } from "node:test";
import { CUSTOM_SLOTS, MAX_COLORS } from "../src/shared/spec";
import {
    DEFAULT_CUSTOM,
    nearestIndex,
    PALETTES,
    remapPixels,
    srgbToOklab,
} from "../webview/lib/palettes";

test("each fixed palette has its published number of distinct #rrggbb colours", () => {
    const counts = { pico8: 16, gameboy: 4, nes: 55 };
    for (const [id, count] of Object.entries(counts)) {
        const colors = PALETTES[id as keyof typeof counts];
        assert.equal(colors.length, count, id);
        assert.equal(new Set(colors).size, count, id);
        assert.ok(colors.length <= MAX_COLORS);
        for (const hex of colors) assert.match(hex, /^#[0-9a-f]{6}$/);
    }
});

test("the custom palette starts as PICO-8", () => {
    assert.equal(DEFAULT_CUSTOM.length, CUSTOM_SLOTS);
    assert.deepEqual(DEFAULT_CUSTOM, PALETTES.pico8);
});

const painted = (grid: Int8Array) => grid.filter((value) => value >= 0).length;
const everyIndex = (count: number) =>
    new Int8Array([-1, ...Array.from({ length: count }, (_, i) => i), -1]);

test("OKLab puts white at L 1 and black at L 0 with no chroma", () => {
    const [L, a, b] = srgbToOklab("#ffffff");
    assert.ok(
        Math.abs(L - 1) < 1e-6 && Math.abs(a) < 1e-6 && Math.abs(b) < 1e-6
    );
    assert.deepEqual(srgbToOklab("#000000"), [0, 0, 0]);
});

test("remapping keeps every painted cell painted and transparent cells transparent", () => {
    const grid = everyIndex(PALETTES.nes.length);
    const remapped = remapPixels(grid, PALETTES.nes, PALETTES.gameboy);
    assert.equal(painted(remapped), painted(grid));
    assert.equal(remapped[0], -1);
    assert.equal(remapped.at(-1), -1);
});

test("every remapped index is within the new palette", () => {
    for (const [from, to] of [
        [PALETTES.nes, PALETTES.gameboy],
        [PALETTES.pico8, PALETTES.nes],
        [PALETTES.gameboy, PALETTES.pico8],
    ]) {
        for (const value of remapPixels(everyIndex(from.length), from, to)) {
            assert.ok(value === -1 || (value >= 0 && value < to.length));
        }
    }
});

test("PICO-8 red maps to the Game Boy's light green", () => {
    assert.equal(PALETTES.pico8[8], "#ff004d");
    assert.equal(nearestIndex("#ff004d", PALETTES.gameboy), 2);
    const remapped = remapPixels(
        new Int8Array([8]),
        PALETTES.pico8,
        PALETTES.gameboy
    );
    assert.deepEqual([...remapped], [2]);
});

test("a colour the new palette already has maps to itself", () => {
    const grid = everyIndex(PALETTES.pico8.length);
    assert.deepEqual(remapPixels(grid, PALETTES.pico8, DEFAULT_CUSTOM), grid);
    assert.equal(
        nearestIndex("#000000", PALETTES.nes),
        PALETTES.nes.indexOf("#000000")
    );
    for (const [i, hex] of PALETTES.gameboy.entries()) {
        assert.equal(nearestIndex(hex, PALETTES.gameboy), i);
    }
});
