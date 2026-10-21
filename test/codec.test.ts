import assert from "node:assert/strict";
import { test } from "node:test";
import {
    decodePixels,
    encodePixels,
    normaliseSettings,
    normaliseSpec,
    SIZES,
    type Settings,
} from "../src/shared/spec";

const SIXTY_FOUR = Array.from(
    { length: 64 },
    (_, i) => `#${i.toString(16).padStart(2, "0")}0000`
);

test("pixels round-trip at every size, through all 64 indexes and transparency", () => {
    for (const size of SIZES) {
        const grid = new Int8Array(size * size).map((_, i) => (i % 65) - 1);
        const encoded = encodePixels(grid);
        assert.equal(encoded.length, size * size);
        assert.deepEqual(decodePixels(encoded, size), grid);
    }
});

test('"." decodes to −1 and the alphabet decodes to its index', () => {
    assert.deepEqual([...decodePixels(".0a_", 2)], [-1, 0, 10, 63]);
    assert.equal(encodePixels(new Int8Array([-1, 0, 10, 63])), ".0a_");
});

test("normaliseSpec accepts a well-formed spec and lowercases its colours", () => {
    const spec = normaliseSpec({
        size: 16,
        palette: { id: "custom", colors: ["#AABBCC", "#000000"] },
        pixels: "1".padEnd(256, "."),
    });
    assert.deepEqual(spec?.palette, {
        id: "custom",
        colors: ["#aabbcc", "#000000"],
    });
});

test("normaliseSpec rejects pixels of the wrong length", () => {
    const base = {
        size: 16,
        palette: { id: "pico8", colors: SIXTY_FOUR.slice(0, 16) },
    };
    assert.equal(normaliseSpec({ ...base, pixels: "0".repeat(255) }), null);
    assert.equal(normaliseSpec({ ...base, pixels: "0".repeat(257) }), null);
    assert.notEqual(normaliseSpec({ ...base, pixels: "0".repeat(256) }), null);
});

test("normaliseSpec rejects bad sizes, palettes, characters, out-of-palette indexes and blank grids", () => {
    const good = {
        size: 16,
        palette: { id: "gameboy", colors: SIXTY_FOUR.slice(0, 4) },
        pixels: "3".padEnd(256, "."),
    };
    assert.notEqual(normaliseSpec(good), null);
    assert.equal(normaliseSpec({ ...good, size: 20 }), null);
    assert.equal(
        normaliseSpec({ ...good, palette: { id: "c64", colors: ["#000000"] } }),
        null
    );
    assert.equal(
        normaliseSpec({ ...good, palette: { id: "custom", colors: ["red"] } }),
        null
    );
    assert.equal(
        normaliseSpec({
            ...good,
            palette: { id: "custom", colors: [...SIXTY_FOUR, "#ffffff"] },
        }),
        null
    );
    assert.equal(
        normaliseSpec({ ...good, pixels: "4".padEnd(256, ".") }),
        null
    );
    assert.equal(
        normaliseSpec({ ...good, pixels: "!".padEnd(256, ".") }),
        null
    );
    assert.equal(normaliseSpec({ ...good, pixels: ".".repeat(256) }), null);
    assert.equal(normaliseSpec(null), null);
});

test("settings fall back field by field and keep 16 custom colours", () => {
    const defaults: Settings = {
        size: 16,
        palette: "pico8",
        custom: SIXTY_FOUR.slice(0, 16),
    };
    assert.deepEqual(normaliseSettings(undefined, defaults), defaults);
    const restored = normaliseSettings(
        { size: 48, palette: "nope", custom: ["#ABCDEF", 3] },
        defaults
    );
    assert.equal(restored.size, 48);
    assert.equal(restored.palette, "pico8");
    assert.equal(restored.custom.length, 16);
    assert.equal(restored.custom[0], "#abcdef");
    assert.equal(restored.custom[1], defaults.custom[1]);
});
