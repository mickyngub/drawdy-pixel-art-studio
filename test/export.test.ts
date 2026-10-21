import assert from "node:assert/strict";
import { test } from "node:test";
import { exportScale, hexRgb } from "../webview/export";

test("each grid size exports at whole pixels per cell, up to 1024 px", () => {
    assert.deepEqual(
        [16, 24, 32, 48, 64].map((size) => [size, exportScale(size)]),
        [
            [16, 64],
            [24, 42],
            [32, 32],
            [48, 21],
            [64, 16],
        ]
    );
});

test("hex colours parse to RGB", () => {
    assert.deepEqual(hexRgb("#ff004d"), [255, 0, 77]);
    assert.deepEqual(hexRgb("#000000"), [0, 0, 0]);
});
