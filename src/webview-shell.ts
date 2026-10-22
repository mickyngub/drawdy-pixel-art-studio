import { PANEL_CSS } from "./panel-css";

const FOCUS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const LINK = `cursor-pointer rounded-sm text-label text-fg-muted underline decoration-line-strong underline-offset-2 transition-colors hover:text-fg ${FOCUS}`;
const BUTTON = `inline-flex h-9 min-w-0 cursor-pointer items-center justify-center rounded-xl border px-3 text-label-md transition-colors disabled:cursor-not-allowed ${FOCUS}`;
const SECONDARY = `${BUTTON} flex-none border-line bg-subtle text-fg-muted enabled:hover:bg-hover enabled:hover:text-fg enabled:active:bg-pressed disabled:text-fg-disabled`;
const PRIMARY = `${BUTTON} flex-1 border-transparent bg-accent text-on-accent enabled:hover:bg-accent-hover enabled:active:bg-accent-pressed disabled:bg-disabled disabled:text-fg-disabled focus-visible:ring-offset-2 focus-visible:ring-offset-panel`;
const PRIMARY_UNLESS_EDITING =
    "group-data-[editing=false]:flex-1 group-data-[editing=false]:border-transparent group-data-[editing=false]:bg-accent group-data-[editing=false]:text-on-accent group-data-[editing=false]:enabled:hover:bg-accent-hover group-data-[editing=false]:enabled:hover:text-on-accent group-data-[editing=false]:enabled:active:bg-accent-pressed group-data-[editing=false]:disabled:bg-disabled group-data-[editing=false]:disabled:text-fg-disabled group-data-[editing=false]:focus-visible:ring-offset-2 group-data-[editing=false]:focus-visible:ring-offset-panel";

const BODY = `
<div id="edit-banner" class="flex flex-none items-center justify-between gap-2 border-b border-divider bg-accent-subtle px-4 py-2 text-body text-fg" hidden>
    <span>Editing pixel art from the board.</span>
    <button type="button" id="stop-edit" class="${LINK}">Stop editing</button>
</div>
<main class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-3 pb-4 [scrollbar-width:thin] [scrollbar-color:var(--color-line-strong)_transparent]">
    <div id="tools" role="toolbar" aria-label="Tools" class="flex flex-none items-center gap-2"></div>
    <div class="flex min-h-0 flex-1 rounded-xl bg-section p-2">
        <div id="grid-area" class="flex min-h-0 flex-1 items-center justify-center">
            <canvas id="grid" class="block size-[var(--side,0px)] flex-none cursor-crosshair touch-none" aria-label="Pixel grid"></canvas>
        </div>
    </div>
    <div class="flex flex-none flex-col gap-3">
        <div id="options" class="grid grid-cols-2 gap-2"></div>
        <div id="swatches" role="group" aria-label="Colours" class="grid grid-cols-16 gap-1 data-many:grid-cols-20"></div>
    </div>
    <div id="status" role="status" aria-live="polite" class="mt-auto flex-none text-body text-fg-subtle empty:-mt-4 data-[tone=bad]:rounded-lg data-[tone=bad]:bg-danger-subtle data-[tone=bad]:px-3 data-[tone=bad]:py-2 data-[tone=bad]:text-fg"></div>
</main>
<footer class="flex flex-none items-center gap-2 border-t border-divider px-4 py-3">
    <div id="actions" class="group flex min-w-0 flex-1 items-center gap-2" data-editing="false">
        <button type="button" id="edit-selected" class="${SECONDARY}" hidden>Edit selected</button>
        <button type="button" id="place" class="${SECONDARY} ${PRIMARY_UNLESS_EDITING}" disabled>Place on board</button>
        <button type="button" id="update" class="${PRIMARY}" hidden>Update</button>
    </div>
</footer>
`;

export function shellHtml(js: string): string {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/google-sans-flex@5.3.2/wght.css" />
<style id="drawdy-styling">:root{/*__DRAWDY_STYLING__*/}</style>
<style>${PANEL_CSS}</style>
</head>
<body class="flex h-screen flex-col overflow-hidden bg-panel font-sans text-body text-fg antialiased">
${BODY}
<script>${js}</script>
</body>
</html>`;
}
