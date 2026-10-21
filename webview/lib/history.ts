export type History<T> = {
    /** Records the state as it was before a change; a new change drops the redo stack. */
    push(before: T): void;
    undo(current: T): T | null;
    redo(current: T): T | null;
    clear(): void;
};

export function createHistory<T>(limit = 100): History<T> {
    const past: T[] = [];
    const future: T[] = [];
    return {
        push(before) {
            past.push(before);
            if (past.length > limit) past.shift();
            future.length = 0;
        },
        undo(current) {
            const previous = past.pop();
            if (previous === undefined) return null;
            future.push(current);
            return previous;
        },
        redo(current) {
            const next = future.pop();
            if (next === undefined) return null;
            past.push(current);
            return next;
        },
        clear() {
            past.length = 0;
            future.length = 0;
        },
    };
}
