import { PANEL_CSS } from "./panel-css";

const FOCUS =
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";
const BUTTON = `cursor-pointer rounded-sm border border-border px-2.5 py-1 text-[11px] enabled:hover:border-foreground disabled:cursor-default disabled:opacity-40 ${FOCUS}`;
const PRIMARY = `cursor-pointer rounded-sm border border-primary bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground enabled:hover:opacity-90 disabled:cursor-default disabled:opacity-40 data-[editing=true]:border-border data-[editing=true]:bg-transparent data-[editing=true]:font-normal data-[editing=true]:text-foreground ${FOCUS}`;

const BODY = `
<header class="flex flex-none items-center justify-between gap-2 border-b border-border px-3 py-1.5">
    <h1 class="text-[13px] font-semibold">Pixel Art Studio</h1>
    <button type="button" id="close" class="${BUTTON}">Close</button>
</header>
<div id="edit-banner" class="flex flex-none items-center justify-between gap-2 border-b border-border bg-surface2 px-3 py-1.5 text-[11px]" hidden>
    <span>Editing pixel art from the board.</span>
    <button type="button" id="stop-edit" class="cursor-pointer text-primary underline underline-offset-2 hover:no-underline ${FOCUS}">Stop editing</button>
</div>
<main class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-2.5">
    <div id="tools" role="toolbar" aria-label="Tools" class="flex flex-none gap-[3px]"></div>
    <canvas id="grid" class="block aspect-square w-full flex-none cursor-crosshair touch-none rounded-sm ring-1 ring-border" aria-label="Pixel grid"></canvas>
    <div id="options" class="flex flex-none items-center gap-3"></div>
    <div id="swatches" role="group" aria-label="Colours" class="grid flex-none grid-cols-16 gap-0.5 data-many:grid-cols-20"></div>
</main>
<footer class="flex flex-none flex-col gap-1.5 border-t border-border px-3 py-2">
    <div id="status" role="status" aria-live="polite" class="min-h-7 text-[10px] text-muted-foreground data-[tone=bad]:text-destructive data-[tone=good]:text-success"></div>
    <div class="flex justify-end gap-1.5">
        <button type="button" id="edit-selected" class="${BUTTON}" hidden>Edit selected</button>
        <button type="button" id="place" class="${PRIMARY}" disabled>Place on board</button>
        <button type="button" id="update" class="${PRIMARY}" hidden>Update on board</button>
    </div>
</footer>
`;

export function shellHtml(js: string): string {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style id="drawdy-styling">:root{/*__DRAWDY_STYLING__*/}</style>
<style>${PANEL_CSS}</style>
</head>
<body class="flex h-screen flex-col overflow-hidden bg-background text-xs/[1.4] text-foreground antialiased">
${BODY}
<script>${js}</script>
</body>
</html>`;
}
