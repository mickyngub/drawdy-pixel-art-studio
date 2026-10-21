import assert from "node:assert/strict";
import { test } from "node:test";
import { createHistory } from "../webview/lib/history";

test("undo returns the state before the last change, redo the one after", () => {
    const history = createHistory<string>();
    history.push("a");
    history.push("b");
    assert.equal(history.undo("c"), "b");
    assert.equal(history.undo("b"), "a");
    assert.equal(history.undo("a"), null);
    assert.equal(history.redo("a"), "b");
    assert.equal(history.redo("b"), "c");
    assert.equal(history.redo("c"), null);
});

test("a new change drops the redo stack", () => {
    const history = createHistory<string>();
    history.push("a");
    history.undo("b");
    history.push("a");
    assert.equal(history.redo("x"), null);
});

test("only the newest entries up to the limit are kept", () => {
    const history = createHistory<number>(100);
    for (let i = 0; i < 150; i++) history.push(i);
    let undone = 0;
    let state: number | null = 150;
    while ((state = history.undo(state as number)) !== null) undone++;
    assert.equal(undone, 100);
});

test("clear forgets both stacks", () => {
    const history = createHistory<string>();
    history.push("a");
    history.push("b");
    history.undo("c");
    history.clear();
    assert.equal(history.undo("x"), null);
    assert.equal(history.redo("x"), null);
});
