import assert from "node:assert/strict";
import { test } from "node:test";
import { CUSTOM_SLOTS, MAX_COLORS } from "../src/shared/spec";
import { DEFAULT_CUSTOM, PALETTES } from "../webview/lib/palettes";

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
