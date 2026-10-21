export type KeyAction = "undo" | "redo" | "blur" | "close" | null;

type Keys = {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
};

/** Undo and redo act on the pixel grid wherever focus is in the panel; the board's own history is left to the board. */
export function keyAction(event: Keys, inField: boolean): KeyAction {
    if (event.key === "Escape") return inField ? "blur" : "close";
    if (event.altKey || !(event.metaKey || event.ctrlKey)) return null;
    const key = event.key.toLowerCase();
    if (key === "z") return event.shiftKey ? "redo" : "undo";
    if (key === "y" && event.ctrlKey && !event.metaKey) return "redo";
    return null;
}

const TEXT_INPUTS = new Set([
    "text",
    "search",
    "url",
    "tel",
    "email",
    "password",
    "number",
]);

export function isField(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    if (target instanceof HTMLTextAreaElement) return true;
    if (target instanceof HTMLSelectElement) return true;
    return target instanceof HTMLInputElement && TEXT_INPUTS.has(target.type);
}
