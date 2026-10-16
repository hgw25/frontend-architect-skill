export type DialogLayer = {
    content: HTMLElement;
    dismiss: () => void;
    initialFocus: () => HTMLElement | null;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
    restoreFocus: HTMLElement | null;
};
export declare function registerDialogLayer(layer: DialogLayer): () => void;
export declare function isTopDialogLayer(content: HTMLElement | null): boolean;
