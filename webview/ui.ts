const FOCUS =
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";
const LABEL = "text-[10px] tracking-[0.02em] text-muted-foreground";
const INPUT =
    "h-6 rounded-sm border border-border bg-background py-0.5 text-[11px] focus:border-primary focus:outline-none disabled:opacity-40";
const SEG_BUTTON = `min-w-0 flex-auto cursor-pointer truncate rounded-sm border border-border px-1.5 py-[3px] text-[10px] text-muted-foreground hover:text-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground ${FOCUS}`;
const ACTION_BUTTON =
    "min-w-0 flex-auto cursor-pointer truncate rounded-sm border border-border px-1.5 py-[3px] text-[10px] text-muted-foreground enabled:hover:text-foreground disabled:cursor-default disabled:opacity-40";
const SWATCH =
    "aspect-square min-w-0 cursor-pointer rounded-[3px] p-0 ring-1 ring-black/20 ring-inset [background:var(--swatch)] aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-foreground";

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

/** Options are [value, caption, tooltip]. */
export function makeSegmented<T extends string>(
    row: HTMLElement,
    options: [T, string, string][],
    initial: T,
    onPick: (value: T) => void
): Control<T> {
    const buttons = options.map(([value, caption, tip]) => {
        const node = button(row, SEG_BUTTON, caption, () => {
            paint(value);
            onPick(value);
        });
        node.title = tip;
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
    caption: string,
    tip: string,
    initial: boolean,
    onChange: (value: boolean) => void
): Control<boolean> {
    let value = initial;
    const node = button(parent, SEG_BUTTON, caption, () => {
        paint(!value);
        onChange(value);
    });
    node.title = tip;
    const paint = (next: boolean) => {
        value = next;
        node.setAttribute("aria-pressed", String(next));
    };
    paint(initial);
    return { set: paint };
}

export function makeAction(
    parent: HTMLElement,
    caption: string,
    tip: string,
    onClick: () => void
): HTMLButtonElement {
    const node = button(parent, ACTION_BUTTON, caption, onClick);
    node.title = tip;
    return node;
}

export function makeInlineSelect(
    parent: HTMLElement,
    label: string,
    options: [string, string][],
    initial: string,
    onPick: (value: string) => void
): Control<string> {
    const wrap = el("label", `flex items-center gap-1.5 ${LABEL}`, parent);
    wrap.append(label);
    const select = el("select", `${INPUT} px-1 text-foreground`, wrap);
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
        `flex basis-full items-center gap-1.5 ${LABEL}`,
        parent
    );
    wrap.append(label);
    const input = el(
        "input",
        `h-6 min-w-0 flex-1 cursor-pointer rounded-sm border border-border bg-background p-0.5 ${FOCUS}`,
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
