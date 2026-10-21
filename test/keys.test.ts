import assert from "node:assert/strict";
import { test } from "node:test";
import { keyAction } from "../webview/lib/keys";

const key = (key: string, mods: Partial<Record<string, boolean>> = {}) => ({
    key,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
});

test("⌘Z and Ctrl+Z undo the grid; ⌘⇧Z, Ctrl+⇧Z and Ctrl+Y redo it", () => {
    assert.equal(keyAction(key("z", { metaKey: true }), false), "undo");
    assert.equal(keyAction(key("z", { ctrlKey: true }), false), "undo");
    assert.equal(
        keyAction(key("Z", { metaKey: true, shiftKey: true }), false),
        "redo"
    );
    assert.equal(
        keyAction(key("z", { ctrlKey: true, shiftKey: true }), false),
        "redo"
    );
    assert.equal(keyAction(key("y", { ctrlKey: true }), false), "redo");
    assert.equal(keyAction(key("y", { metaKey: true }), false), null);
    assert.equal(keyAction(key("z"), false), null);
    assert.equal(
        keyAction(key("z", { metaKey: true, altKey: true }), false),
        null
    );
});

test("grid undo and redo also work while a select has focus", () => {
    assert.equal(keyAction(key("z", { metaKey: true }), true), "undo");
    assert.equal(keyAction(key("y", { ctrlKey: true }), true), "redo");
});

test("Escape leaves a field instead of closing the panel", () => {
    assert.equal(keyAction(key("Escape"), true), "blur");
    assert.equal(keyAction(key("Escape"), false), "close");
});
