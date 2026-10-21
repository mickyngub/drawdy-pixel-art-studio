import type { DriverToWebview, WebviewToDriver } from "../src/shared/messages";
import {
    decodePixels,
    encodePixels,
    normaliseSettings,
    PALETTE_IDS,
    SIZES,
    type GridSize,
    type PaletteId,
    type PixelSpec,
    type Settings,
} from "../src/shared/spec";
import { cellCanvas, exportPng, type Rgb } from "./export";
import { createHistory } from "./lib/history";
import { isField, keyAction } from "./lib/keys";
import { DEFAULT_CUSTOM, PALETTE_NAMES, PALETTES } from "./lib/palettes";
import {
    bresenham,
    dropMissingColours,
    floodFill,
    mirrorX,
    resizeGrid,
    type Point,
} from "./lib/tools";
import {
    makeColourInput,
    makeInlineSelect,
    makeSegmented,
    makeSwatchGrid,
    makeToggle,
} from "./ui";

type DrawdyWebviewApi = {
    postMessage(message: unknown, transfer?: Transferable[]): void;
    onMessage(listener: (message: unknown) => void): () => void;
};

declare function acquireDrawdyApi(): DrawdyWebviewApi;

type Tool = "pencil" | "eraser" | "fill" | "picker" | "line";
type Doc = { size: GridSize; paletteId: PaletteId; grid: Int8Array };
type Drag = { before: Doc; origin: Point; last: Point };

const SETTINGS_DEBOUNCE_MS = 400;
const REPLY_TIMEOUT_MS = 20000;
const HISTORY_LIMIT = 100;
const GRID_LINE_MIN_CELL_PX = 6;
const CHECKER: [Rgb, Rgb] = [
    [255, 255, 255],
    [226, 232, 240],
];
const GRID_LINE = "rgba(15, 23, 42, 0.1)";
const MIRROR_AXIS = "rgba(79, 70, 229, 0.85)";
const HOVER = "rgba(15, 23, 42, 0.8)";
const DEFAULTS: Settings = {
    size: 16,
    palette: "pico8",
    custom: [...DEFAULT_CUSTOM],
};

const api = acquireDrawdyApi();
const byId = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T;

const closeButton = byId<HTMLButtonElement>("close");
const banner = byId<HTMLDivElement>("edit-banner");
const stopEditButton = byId<HTMLButtonElement>("stop-edit");
const toolsRow = byId<HTMLDivElement>("tools");
const gridCanvas = byId<HTMLCanvasElement>("grid");
const optionsRow = byId<HTMLDivElement>("options");
const swatchGrid = byId<HTMLDivElement>("swatches");
const statusLine = byId<HTMLDivElement>("status");
const editSelectedButton = byId<HTMLButtonElement>("edit-selected");
const placeButton = byId<HTMLButtonElement>("place");
const updateButton = byId<HTMLButtonElement>("update");

const blankGrid = (size: number) => new Int8Array(size * size).fill(-1);
const copyDoc = (d: Doc): Doc => ({ ...d, grid: d.grid.slice() });

let doc: Doc = {
    size: DEFAULTS.size,
    paletteId: DEFAULTS.palette,
    grid: blankGrid(DEFAULTS.size),
};
let custom = [...DEFAULTS.custom];
let colour = 0;
let tool: Tool = "pencil";
let mirror = false;
let drag: Drag | null = null;
let hover: Point | null = null;
let editing = false;
let busy = false;
let busyTimer = 0;
let settingsTimer = 0;
let frame = 0;
const history = createHistory<Doc>(HISTORY_LIMIT);

const colorsOf = (id: PaletteId): readonly string[] =>
    id === "custom" ? custom : PALETTES[id];
const isBlank = () => doc.grid.every((value) => value < 0);
const strokeValue = () => (tool === "eraser" ? -1 : colour);

const toolControl = makeSegmented<Tool>(
    toolsRow,
    [
        ["pencil", "Pencil", "Pencil: paint cells"],
        ["eraser", "Eraser", "Eraser: clear cells"],
        ["fill", "Fill", "Fill: flood an area with the colour"],
        ["picker", "Picker", "Eyedropper: pick a colour from the grid"],
        ["line", "Line", "Line: drag from one end to the other"],
    ],
    tool,
    (next) => {
        tool = next;
        schedulePaint();
    }
);
makeToggle(
    toolsRow,
    "Mirror",
    "Mirror: pencil, eraser and line also paint the left-right reflection",
    mirror,
    (next) => {
        mirror = next;
        schedulePaint();
    }
);
const sizeControl = makeInlineSelect(
    optionsRow,
    "Size",
    SIZES.map((size) => [String(size), `${size} × ${size}`]),
    String(doc.size),
    (value) => changeSize(Number(value) as GridSize)
);
const paletteControl = makeInlineSelect(
    optionsRow,
    "Palette",
    PALETTE_IDS.map((id) => [id, PALETTE_NAMES[id]]),
    doc.paletteId,
    (value) => changePalette(value as PaletteId)
);
const colourInput = makeColourInput(
    optionsRow,
    "Colour",
    (hex) => {
        custom[colour] = hex;
        swatches.recolour(colour, hex);
        schedulePaint();
    },
    scheduleSettings
);
const swatches = makeSwatchGrid(swatchGrid, (index) => {
    colour = index;
    syncColourInput();
});

function send(message: WebviewToDriver): void {
    api.postMessage(message);
}

function setStatus(text: string, tone: "" | "good" | "bad" = ""): void {
    statusLine.textContent = text;
    statusLine.dataset.tone = tone;
}

function syncColourInput(): void {
    colourInput.wrap.hidden = doc.paletteId !== "custom";
    colourInput.set(colorsOf(doc.paletteId)[colour]);
}

function syncPalette(): void {
    const colors = colorsOf(doc.paletteId);
    if (colour >= colors.length) colour = 0;
    swatches.show(colors, colour);
    syncColourInput();
}

function updateChrome(): void {
    const empty = isBlank();
    placeButton.disabled = empty || busy;
    updateButton.disabled = empty || busy;
    placeButton.textContent = editing ? "Place as new" : "Place on board";
    placeButton.dataset.editing = String(editing);
    updateButton.hidden = !editing;
    banner.hidden = !editing;
}

function schedulePaint(): void {
    if (!frame) frame = requestAnimationFrame(paint);
}

function outlineCell(
    ctx: CanvasRenderingContext2D,
    cell: number,
    [x, y]: Point,
    width: number
): void {
    const x0 = Math.round(x * cell);
    const y0 = Math.round(y * cell);
    const x1 = Math.round((x + 1) * cell);
    const y1 = Math.round((y + 1) * cell);
    ctx.strokeRect(
        x0 + width / 2,
        y0 + width / 2,
        x1 - x0 - width,
        y1 - y0 - width
    );
}

function paint(): void {
    frame = 0;
    const ratio = window.devicePixelRatio || 1;
    const side = Math.max(1, Math.round(gridCanvas.clientWidth * ratio));
    if (gridCanvas.width !== side) {
        gridCanvas.width = side;
        gridCanvas.height = side;
    }
    const ctx = gridCanvas.getContext("2d") as CanvasRenderingContext2D;
    const { size } = doc;
    const cell = side / size;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
        cellCanvas(
            doc.grid,
            size,
            colorsOf(doc.paletteId),
            (x, y) => CHECKER[(x + y) % 2]
        ),
        0,
        0,
        side,
        side
    );
    const line = Math.max(1, Math.round(ratio));
    if (cell / ratio >= GRID_LINE_MIN_CELL_PX) {
        ctx.strokeStyle = GRID_LINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < size; i++) {
            const at = Math.round(i * cell) + 0.5;
            ctx.moveTo(at, 0);
            ctx.lineTo(at, side);
            ctx.moveTo(0, at);
            ctx.lineTo(side, at);
        }
        ctx.stroke();
    }
    const mirrors = mirror && tool !== "fill" && tool !== "picker";
    if (mirrors) {
        ctx.strokeStyle = MIRROR_AXIS;
        ctx.lineWidth = line;
        ctx.beginPath();
        ctx.moveTo(side / 2, 0);
        ctx.lineTo(side / 2, side);
        ctx.stroke();
    }
    if (hover) {
        ctx.strokeStyle = HOVER;
        ctx.lineWidth = line;
        outlineCell(ctx, cell, hover, line);
        if (mirrors)
            outlineCell(ctx, cell, [size - 1 - hover[0], hover[1]], line);
    }
}

function pointAt(event: PointerEvent): Point {
    const rect = gridCanvas.getBoundingClientRect();
    return [
        Math.floor(((event.clientX - rect.left) / rect.width) * doc.size),
        Math.floor(((event.clientY - rect.top) / rect.height) * doc.size),
    ];
}

const inside = ([x, y]: Point) =>
    x >= 0 && y >= 0 && x < doc.size && y < doc.size;

function plot(points: Point[], value: number): void {
    const { grid, size } = doc;
    for (const point of points) {
        if (!inside(point)) continue;
        const index = point[1] * size + point[0];
        grid[index] = value;
        if (mirror) grid[mirrorX(index, size)] = value;
    }
}

function commit(before: Doc): void {
    history.push(before);
    updateChrome();
    schedulePaint();
}

function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || drag) return;
    const point = pointAt(event);
    if (!inside(point)) return;
    event.preventDefault();
    const index = point[1] * doc.size + point[0];
    if (tool === "picker") {
        const picked = doc.grid[index];
        if (picked < 0) return;
        colour = picked;
        swatches.select(colour);
        syncColourInput();
        tool = "pencil";
        toolControl.set(tool);
        schedulePaint();
        return;
    }
    if (tool === "fill") {
        const before = copyDoc(doc);
        if (floodFill(doc.grid, doc.size, index, colour)) commit(before);
        return;
    }
    drag = { before: copyDoc(doc), origin: point, last: point };
    gridCanvas.setPointerCapture(event.pointerId);
    plot([point], strokeValue());
    schedulePaint();
}

function onPointerMove(event: PointerEvent): void {
    const point = pointAt(event);
    hover = inside(point) ? point : null;
    if (drag) {
        if (tool === "line") {
            doc.grid.set(drag.before.grid);
            plot(bresenham(...drag.origin, ...point), strokeValue());
        } else {
            plot(bresenham(...drag.last, ...point), strokeValue());
        }
        drag.last = point;
    }
    schedulePaint();
}

function endDrag(): void {
    if (!drag) return;
    const { before } = drag;
    drag = null;
    if (before.grid.some((value, i) => value !== doc.grid[i])) commit(before);
    else schedulePaint();
}

function show(next: Doc): void {
    doc = next;
    sizeControl.set(String(doc.size));
    paletteControl.set(doc.paletteId);
    syncPalette();
    updateChrome();
    schedulePaint();
}

function changeSize(size: GridSize): void {
    if (size === doc.size || drag) return;
    history.push(copyDoc(doc));
    show({ ...doc, size, grid: resizeGrid(doc.grid, doc.size, size) });
    scheduleSettings();
}

function changePalette(id: PaletteId): void {
    if (id === doc.paletteId || drag) return;
    history.push(copyDoc(doc));
    show({
        ...doc,
        paletteId: id,
        grid: dropMissingColours(doc.grid, colorsOf(id).length),
    });
    scheduleSettings();
}

function step(action: "undo" | "redo"): void {
    if (drag) return;
    const next = action === "undo" ? history.undo(doc) : history.redo(doc);
    if (!next) return;
    show(next);
    scheduleSettings();
}

function sendSettings(): void {
    const settings: Settings = {
        size: doc.size,
        palette: doc.paletteId,
        custom: [...custom],
    };
    send({ type: "settings", settings });
}

// Art loaded for editing brings its own size and palette, which must not become the remembered ones.
function scheduleSettings(): void {
    if (editing) return;
    if (settingsTimer) clearTimeout(settingsTimer);
    settingsTimer = setTimeout(() => {
        settingsTimer = 0;
        sendSettings();
    }, SETTINGS_DEBOUNCE_MS) as unknown as number;
}

function flushSettings(): void {
    if (!settingsTimer) return;
    clearTimeout(settingsTimer);
    settingsTimer = 0;
    sendSettings();
}

function setEditing(next: boolean): void {
    editing = next;
    updateChrome();
}

function setBusy(next: boolean): void {
    busy = next;
    if (busyTimer) clearTimeout(busyTimer);
    busyTimer = 0;
    updateChrome();
}

function awaitReply(): void {
    if (busyTimer) clearTimeout(busyTimer);
    busyTimer = setTimeout(() => {
        busyTimer = 0;
        setBusy(false);
        setStatus("Drawdy didn't answer. Try again.", "bad");
    }, REPLY_TIMEOUT_MS) as unknown as number;
}

function sendArt(mode: "place" | "update"): void {
    if (busy || isBlank()) return;
    setBusy(true);
    setStatus(mode === "update" ? "Updating…" : "Placing…");
    try {
        const colors = colorsOf(doc.paletteId);
        const spec: PixelSpec = {
            size: doc.size,
            palette: { id: doc.paletteId, colors: [...colors] },
            pixels: encodePixels(doc.grid),
        };
        send({ type: mode, ...exportPng(doc.grid, doc.size, colors), spec });
        awaitReply();
    } catch {
        setBusy(false);
        setStatus("The pixel art could not be drawn. Try again.", "bad");
    }
}

function loadSpec(spec: PixelSpec): void {
    flushSettings();
    if (spec.palette.id === "custom") {
        custom = DEFAULT_CUSTOM.map((hex, i) => spec.palette.colors[i] ?? hex);
    }
    history.clear();
    setEditing(true);
    show({
        size: spec.size,
        paletteId: spec.palette.id,
        grid: dropMissingColours(
            decodePixels(spec.pixels, spec.size),
            colorsOf(spec.palette.id).length
        ),
    });
    setStatus(
        "Loaded the selected pixel art. Change it, then click Update on board."
    );
}

function wire(): void {
    closeButton.addEventListener("click", () => send({ type: "close" }));
    placeButton.addEventListener("click", () => sendArt("place"));
    updateButton.addEventListener("click", () => sendArt("update"));
    editSelectedButton.addEventListener("click", () => {
        setStatus("Reading the selected pixel art…");
        send({ type: "edit-selected" });
    });
    stopEditButton.addEventListener("click", () => {
        setEditing(false);
        send({ type: "stop-edit" });
        setStatus("Stopped editing. Place on board adds new pixel art.");
    });
    gridCanvas.addEventListener("pointerdown", onPointerDown);
    gridCanvas.addEventListener("pointermove", onPointerMove);
    gridCanvas.addEventListener("pointerup", endDrag);
    gridCanvas.addEventListener("pointercancel", endDrag);
    gridCanvas.addEventListener("lostpointercapture", endDrag);
    gridCanvas.addEventListener("pointerleave", () => {
        hover = null;
        schedulePaint();
    });
    gridCanvas.addEventListener("contextmenu", (event) =>
        event.preventDefault()
    );
    new ResizeObserver(schedulePaint).observe(gridCanvas);
    document.addEventListener("keydown", (event) => {
        const action = keyAction(event, isField(event.target));
        if (!action) return;
        event.preventDefault();
        if (action === "blur") (event.target as HTMLElement).blur();
        else if (action === "close") send({ type: "close" });
        else step(action);
    });
}

function placedText(
    message: Extract<DriverToWebview, { type: "placed" }>
): string {
    if (message.mode === "new") {
        return "Placed the pixel art. To undo, click the board and press ⌘Z or Ctrl+Z.";
    }
    const times =
        message.undoSteps === 2 ? "twice" : `${message.undoSteps} times`;
    return `Updated the pixel art${
        message.rotationReset ? " (rotation reset)" : ""
    }. To get the old version back, click the board and press ⌘Z or Ctrl+Z ${times}.`;
}

function handle(message: DriverToWebview): void {
    switch (message.type) {
        case "init": {
            const settings = normaliseSettings(message.settings, DEFAULTS);
            custom = settings.custom;
            if (editing || !isBlank()) {
                syncPalette();
                schedulePaint();
                return;
            }
            show({
                size: settings.size,
                paletteId: settings.palette,
                grid: blankGrid(settings.size),
            });
            return;
        }
        case "theme": {
            const node = document.getElementById("drawdy-styling");
            if (node) node.textContent = `:root{${message.cssVars}}`;
            return;
        }
        case "selection": {
            editSelectedButton.hidden = !message.editable;
            return;
        }
        case "load": {
            loadSpec(message.spec);
            return;
        }
        case "edit-ended": {
            setEditing(false);
            return;
        }
        case "placed": {
            setBusy(false);
            setStatus(placedText(message), "good");
            return;
        }
        case "error": {
            setBusy(false);
            setStatus(message.message, "bad");
            return;
        }
    }
}

wire();
syncPalette();
updateChrome();
schedulePaint();

api.onMessage((raw) => {
    if (!raw || typeof raw !== "object") return;
    handle(raw as DriverToWebview);
});

send({ type: "ready" });
