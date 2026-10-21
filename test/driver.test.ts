import assert from "node:assert/strict";
import { test } from "node:test";
import type { DriverManifest } from "@drawdy/driver-protocol";
import * as driver from "../src/index";
import { overlaps } from "../src/lib/free-spot";
import type { PixelSpec } from "../src/shared/spec";
import { boot, fakeHost } from "./fake-host";

const manifest = {
    driverId: "mickyngub.pixel-art-studio",
    driverName: "Pixel Art Studio",
} as DriverManifest;

const webviewDomId = `${manifest.driverId}:webview`;

const specOf = (size: 16 | 32): PixelSpec => ({
    size,
    palette: {
        id: "gameboy",
        colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
    },
    pixels: "3".padEnd(size * size, "."),
});

const artOf = (size: 16 | 32) => ({
    dataUrl: "data:image/png;base64,AAAA",
    pixelWidth: 1024,
    pixelHeight: 1024,
    spec: specOf(size),
});

const own = (meta: unknown) =>
    (meta as Record<string, { spec: PixelSpec }>)[manifest.driverId];

const clickActionButton = () =>
    driver.onEvent({
        type: "subscription:dom:element-clicked",
        body: { domElementId: `${manifest.driverId}:action-button` },
    } as any);

test("activate touches only the dom permission", async () => {
    const host = fakeHost();
    await boot(driver, host, manifest);
    const types = host.types();
    assert.ok(types.includes("command:dom:create-action-button"));
    for (const type of types) {
        assert.match(type, /^(command|subscription):(dom|webview):/);
    }
});

test("the action button opens the panel, kept alive when closed and styled for the board", async () => {
    const host = fakeHost();
    await boot(driver, host, manifest);
    await clickActionButton();
    const create = host.sent.find((s) => s.type === "command:webview:create");
    assert.ok(create);
    assert.equal(create.req.webviewDomId, webviewDomId);
    assert.equal(create.req.keepStateWhenClosed, true);
    assert.ok(!create.req.htmlContent.includes("/*__DRAWDY_STYLING__*/"));
    assert.ok(create.req.htmlContent.includes("color-scheme: light;"));
});

test("close hides the panel", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.clear();
    await message({ type: "close" });
    const hide = host.sent.find((s) => s.type === "command:webview:hide");
    assert.ok(hide);
    assert.equal(hide.req.webviewDomId, webviewDomId);
});

test("the first ready loads settings and subscribes to the selection, once", async () => {
    const host = fakeHost({ kv: { settings: { size: 32, palette: "nes" } } });
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    await message({ type: "ready" });
    const types = host.types();
    assert.equal(types.filter((t) => t === "command:kv-storage:get").length, 1);
    assert.equal(
        types.filter((t) => t === "subscription:scene:drawdy-element-selection")
            .length,
        1
    );
    const init = host.posted.find((m) => m.type === "init");
    assert.deepEqual(init.settings, { size: 32, palette: "nes" });
});

test("settings from the panel are stored", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    const settings = { size: 24, palette: "custom", custom: ["#123456"] };
    await message({ type: "settings", settings });
    assert.deepEqual(host.kv.settings, settings);
});

test("a theme change reaches the open panel", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.clear();
    await driver.onEvent({
        type: "subscription:dom:theme-changed",
        body: { styling: { theme: "dark", primary: "#818cf8" } },
    } as any);
    assert.deepEqual(host.posted, [
        {
            type: "theme",
            cssVars: "color-scheme: dark;--drawdy-primary: #818cf8;",
        },
    ]);
});

test("selection events are ignored while the panel is closed", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    await message({ type: "close" });
    host.clear();
    await driver.onEvent({
        type: "subscription:scene:drawdy-element-selection",
        body: { drawdyElementIds: ["x"] },
    } as any);
    assert.equal(host.sent.length, 0);
});

test("placed art is size × 8 board units wide, square, and carries its spec", async () => {
    for (const size of [16, 32] as const) {
        const host = fakeHost();
        const { message } = await boot(driver, host, manifest);
        await message({ type: "ready" });
        await message({ type: "place", ...artOf(size) });
        const [placed] = [...host.elements.values()];
        assert.equal(placed.type, "image");
        assert.equal(placed.width, size * 8);
        assert.equal(placed.height, size * 8);
        assert.deepEqual(own(placed.meta), { v: 1, spec: specOf(size) });
    }
});

test("a second place lands beside the first, and each result is selected", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    await message({ type: "place", ...artOf(16) });
    await message({ type: "place", ...artOf(16) });
    const placed = [...host.elements.values()];
    assert.equal(placed.length, 2);
    const [a, b] = placed.map((el) => ({
        x: el.x as number,
        y: el.y as number,
        width: el.width as number,
        height: el.height as number,
    }));
    assert.equal(overlaps(a, b), false);
    const selections = host.sent.filter(
        (s) => s.type === "command:scene:set-selection"
    );
    assert.deepEqual(
        selections.map((s) => s.req.drawdyElementIds),
        placed.map((el) => [el.drawdyElementId])
    );
    assert.equal(host.posted.filter((m) => m.type === "placed").length, 2);
});

test("a spec whose pixels do not fill the grid is refused without touching the board", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    const art = artOf(16);
    await message({
        type: "place",
        ...art,
        spec: { ...art.spec, pixels: art.spec.pixels.slice(1) },
    });
    assert.ok(!host.types().includes("command:scene:add-drawdy-elements"));
    assert.equal(host.posted.at(-1).type, "error");
});

test("a full board is reported instead of a silent success", async () => {
    const host = fakeHost({ full: true });
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    await message({ type: "place", ...artOf(16) });
    assert.deepEqual(host.posted.at(-1), {
        type: "error",
        message: driver.BOARD_FULL,
    });
});

test("edit selected loads the spec of the one selected pixel art image", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.put({
        drawdyElementId: "art",
        type: "image",
        x: 0,
        y: 0,
        width: 128,
        height: 128,
        meta: { [manifest.driverId]: { v: 1, spec: specOf(16) } },
    });
    host.put({ drawdyElementId: "box", type: "rectangle", x: 0, y: 0 });
    host.select(["art", "box"]);
    await message({ type: "edit-selected" });
    assert.deepEqual(host.posted.at(-1), { type: "load", spec: specOf(16) });
});

test("edit selected with no pixel art selected is an error, not a load", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.put({ drawdyElementId: "box", type: "rectangle", x: 0, y: 0 });
    host.select(["box"]);
    await message({ type: "edit-selected" });
    assert.equal(host.posted.at(-1).type, "error");
    assert.ok(!host.posted.some((m) => m.type === "load"));
});

test("update re-reads the art and keeps its spot, width, layer, group, frame, opacity and lock", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.put({
        drawdyElementId: "old",
        type: "image",
        x: 120,
        y: -80,
        width: 300,
        height: 300,
        rotation: 0.3,
        opacity: 0.5,
        layer: 4,
        frameId: "frame-1",
        groupId: "group-1",
        locked: false,
        meta: { [manifest.driverId]: { v: 1, spec: specOf(16) } },
    });
    host.select(["old"]);
    await message({ type: "edit-selected" });
    // Moved and locked after Edit selected: the update must use the new values.
    host.put({ ...host.elements.get("old")!, x: 500, locked: true });
    await message({ type: "update", ...artOf(32) });

    assert.equal(host.elements.has("old"), false);
    const [fresh] = [...host.elements.values()];
    assert.equal(fresh.x, 500);
    assert.equal(fresh.y, -80);
    assert.equal(fresh.width, 300);
    assert.equal(fresh.height, 300);
    assert.equal(fresh.layer, 4);
    assert.equal(fresh.frameId, "frame-1");
    assert.equal(fresh.groupId, "group-1");
    assert.equal(fresh.opacity, 0.5);
    assert.equal(fresh.locked, true);
    assert.deepEqual(own(fresh.meta).spec, specOf(32));

    const order = host
        .types()
        .filter((t) => /remove-drawdy|add-drawdy/.test(t));
    assert.deepEqual(order, [
        "command:scene:remove-drawdy-elements",
        "command:scene:add-drawdy-elements",
    ]);
    assert.deepEqual(host.posted.at(-2), {
        type: "placed",
        mode: "update",
        undoSteps: 3,
        rotationReset: true,
    });
});

test("update after stop-edit asks for a selection instead of replacing anything", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.put({
        drawdyElementId: "old",
        type: "image",
        x: 0,
        y: 0,
        width: 128,
        height: 128,
        meta: { [manifest.driverId]: { v: 1, spec: specOf(16) } },
    });
    host.select(["old"]);
    await message({ type: "edit-selected" });
    await message({ type: "stop-edit" });
    await message({ type: "update", ...artOf(16) });
    assert.ok(host.elements.has("old"));
    assert.ok(!host.types().includes("command:scene:remove-drawdy-elements"));
    assert.equal(host.posted.at(-1).type, "error");
});

test("a failed add after the remove is undone, so the old art comes back", async () => {
    const host = fakeHost({ failAdd: true });
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.put({
        drawdyElementId: "old",
        type: "image",
        x: 0,
        y: 0,
        width: 128,
        height: 128,
        meta: { [manifest.driverId]: { v: 1, spec: specOf(16) } },
    });
    host.select(["old"]);
    await message({ type: "edit-selected" });
    await message({ type: "update", ...artOf(16) });
    assert.ok(host.types().includes("command:history:undo"));
    assert.ok(host.elements.has("old"));
    assert.equal(host.posted.at(-1).type, "error");
});

test("a denied board read on ready ends in the permission message, not a hang", async () => {
    const host = fakeHost({ denied: ["command:scene"] });
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    assert.deepEqual(host.posted.at(-1), {
        type: "error",
        message: driver.NEEDS_PERMISSION,
    });
});

test("a denied board read on edit selected ends in the permission message", async () => {
    const host = fakeHost({ denied: ["command:scene"] });
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.clear();
    await message({ type: "edit-selected" });
    assert.deepEqual(host.posted.at(-1), {
        type: "error",
        message: driver.NEEDS_PERMISSION,
    });
});
