import { ICONS, icon } from "./lib/icons";

const FOCUS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const LABEL = "text-label text-fg-muted";
const SELECT =
    "h-8 w-full cursor-pointer appearance-none rounded-lg border border-line bg-subtle pr-8 pl-3 text-label text-fg transition-colors hover:bg-hover focus:border-line-strong focus:bg-active focus:outline-none focus:ring-1 focus:ring-ring";
const TRACK = "flex h-8 flex-none gap-0.5 rounded-lg bg-control-subtle p-0.5";
const SEG_BUTTON =
    "grid w-9 cursor-pointer place-items-center rounded-md text-fg-subtle transition-colors hover:text-fg aria-pressed:bg-control aria-pressed:text-fg";
const ICON_BUTTON =
    "inline-grid size-7.5 flex-none cursor-pointer place-items-center rounded-lg text-fg-muted transition-colors enabled:hover:bg-hover enabled:hover:text-fg enabled:active:bg-pressed disabled:cursor-not-allowed disabled:text-fg-disabled aria-pressed:bg-control aria-pressed:text-fg";
const SWATCH =
    "aspect-square min-w-0 cursor-pointer rounded-sm p-0 ring-1 ring-black/10 ring-inset [background:var(--swatch)] aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-fg";

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    parent?: HTMLElement
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
}

export function button(
    parent: HTMLElement,
    className: string,
    text: string,
    onClick: () => void,
    label?: string
): HTMLButtonElement {
    const node = el("button", `${className} ${FOCUS}`, parent);
    node.type = "button";
    node.textContent = text;
    if (label) {
        node.setAttribute("aria-label", label);
        node.title = label;
    }
    node.addEventListener("click", onClick);
    return node;
}

export type Control<T> = { set(value: T): void };

/** Options are [value, name, tooltip, glyph markup]. */
export function makeSegmented<T extends string>(
    row: HTMLElement,
    options: [T, string, string, string][],
    initial: T,
    onPick: (value: T) => void
): Control<T> {
    const track = el("div", TRACK, row);
    const buttons = options.map(([value, name, tip, glyph]) => {
        const node = button(
            track,
            SEG_BUTTON,
            "",
            () => {
                paint(value);
                onPick(value);
            },
            name
        );
        node.title = tip;
        node.innerHTML = glyph;
        return { value, node };
    });
    const paint = (current: T) => {
        for (const entry of buttons) {
            entry.node.setAttribute(
                "aria-pressed",
                String(entry.value === current)
            );
        }
    };
    paint(initial);
    return { set: paint };
}

export function makeToggle(
    parent: HTMLElement,
    name: string,
    tip: string,
    glyph: string,
    initial: boolean,
    onChange: (value: boolean) => void
): Control<boolean> {
    let value = initial;
    const node = button(
        parent,
        ICON_BUTTON,
        "",
        () => {
            paint(!value);
            onChange(value);
        },
        name
    );
    node.title = tip;
    node.innerHTML = glyph;
    const paint = (next: boolean) => {
        value = next;
        node.setAttribute("aria-pressed", String(next));
    };
    paint(initial);
    return { set: paint };
}

export function makeAction(
    parent: HTMLElement,
    name: string,
    tip: string,
    glyph: string,
    onClick: () => void
): HTMLButtonElement {
    const node = button(parent, `${ICON_BUTTON} ml-auto`, "", onClick, name);
    node.title = tip;
    node.innerHTML = glyph;
    return node;
}

export function makeInlineSelect(
    parent: HTMLElement,
    label: string,
    options: [string, string][],
    initial: string,
    onPick: (value: string) => void
): Control<string> {
    const wrap = el(
        "label",
        `flex min-w-0 items-center gap-2 ${LABEL}`,
        parent
    );
    wrap.append(label);
    const box = el("span", "relative min-w-0 flex-1", wrap);
    const select = el("select", SELECT, box);
    box.insertAdjacentHTML(
        "beforeend",
        icon(
            ICONS.chevron,
            "pointer-events-none absolute top-2 right-2.5 size-4 text-fg-subtle"
        )
    );
    for (const [value, caption] of options) {
        const option = el("option", undefined, select);
        option.value = value;
        option.textContent = caption;
    }
    select.value = initial;
    select.addEventListener("change", () => onPick(select.value));
    return {
        set(value) {
            select.value = value;
        },
    };
}

export function makeColourInput(
    parent: HTMLElement,
    label: string,
    onInput: (value: string) => void,
    onCommit: () => void
): Control<string> & { wrap: HTMLElement } {
    const wrap = el(
        "label",
        `col-span-2 flex items-center gap-2 ${LABEL}`,
        parent
    );
    wrap.append(label);
    const input = el(
        "input",
        `h-8 min-w-0 flex-1 cursor-pointer rounded-lg border border-line bg-subtle p-1 transition-colors hover:bg-hover [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 ${FOCUS}`,
        wrap
    );
    input.type = "color";
    input.addEventListener("input", () => onInput(input.value.toLowerCase()));
    input.addEventListener("change", onCommit);
    return {
        wrap,
        set(value) {
            input.value = value;
        },
    };
}

export function makeSwatchGrid(
    grid: HTMLElement,
    onPick: (index: number) => void
) {
    let nodes: HTMLButtonElement[] = [];
    const select = (index: number) => {
        nodes.forEach((node, i) =>
            node.setAttribute("aria-pressed", String(i === index))
        );
    };
    const recolour = (node: HTMLButtonElement, hex: string) => {
        node.style.setProperty("--swatch", hex);
        node.setAttribute("aria-label", hex);
        node.title = hex;
    };
    return {
        show(colors: readonly string[], selected: number) {
            grid.replaceChildren();
            grid.toggleAttribute("data-many", colors.length > 16);
            nodes = colors.map((hex, i) => {
                const node = button(grid, SWATCH, "", () => {
                    select(i);
                    onPick(i);
                });
                recolour(node, hex);
                return node;
            });
            select(selected);
        },
        select,
        recolour(index: number, hex: string) {
            if (nodes[index]) recolour(nodes[index], hex);
        },
    };
}
