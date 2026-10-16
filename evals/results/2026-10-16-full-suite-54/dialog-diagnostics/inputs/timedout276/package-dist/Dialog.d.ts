import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
export type DialogRootProps = {
    children: ReactNode;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
};
export declare function DialogRoot({ children, defaultOpen, onOpenChange, open }: DialogRootProps): import("react/jsx-runtime").JSX.Element;
export type DialogTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;
export declare const DialogTrigger: import("react").ForwardRefExoticComponent<DialogTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
export type DialogPortalProps = {
    children: ReactNode;
    container?: Element | DocumentFragment | null;
};
export declare function DialogPortal({ children, container }: DialogPortalProps): import("react").ReactPortal | null;
export type DialogOverlayProps = HTMLAttributes<HTMLDivElement>;
export declare const DialogOverlay: import("react").ForwardRefExoticComponent<DialogOverlayProps & import("react").RefAttributes<HTMLDivElement>>;
export type DialogContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'role'> & {
    initialFocusRef?: RefObject<HTMLElement | null>;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
};
export declare const DialogContent: import("react").ForwardRefExoticComponent<Omit<HTMLAttributes<HTMLDivElement>, "role"> & {
    initialFocusRef?: RefObject<HTMLElement | null>;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
} & import("react").RefAttributes<HTMLDivElement>>;
export type DialogTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, 'id'>;
export declare const DialogTitle: import("react").ForwardRefExoticComponent<DialogTitleProps & import("react").RefAttributes<HTMLHeadingElement>>;
export type DialogDescriptionProps = Omit<HTMLAttributes<HTMLParagraphElement>, 'id'>;
export declare const DialogDescription: import("react").ForwardRefExoticComponent<DialogDescriptionProps & import("react").RefAttributes<HTMLParagraphElement>>;
export type DialogCloseProps = ButtonHTMLAttributes<HTMLButtonElement>;
export declare const DialogClose: import("react").ForwardRefExoticComponent<DialogCloseProps & import("react").RefAttributes<HTMLButtonElement>>;
export declare const Dialog: {
    Close: import("react").ForwardRefExoticComponent<DialogCloseProps & import("react").RefAttributes<HTMLButtonElement>>;
    Content: import("react").ForwardRefExoticComponent<Omit<HTMLAttributes<HTMLDivElement>, "role"> & {
        initialFocusRef?: RefObject<HTMLElement | null>;
        onEscapeKeyDown?: (event: KeyboardEvent) => void;
    } & import("react").RefAttributes<HTMLDivElement>>;
    Description: import("react").ForwardRefExoticComponent<DialogDescriptionProps & import("react").RefAttributes<HTMLParagraphElement>>;
    Overlay: import("react").ForwardRefExoticComponent<DialogOverlayProps & import("react").RefAttributes<HTMLDivElement>>;
    Portal: typeof DialogPortal;
    Root: typeof DialogRoot;
    Title: import("react").ForwardRefExoticComponent<DialogTitleProps & import("react").RefAttributes<HTMLHeadingElement>>;
    Trigger: import("react").ForwardRefExoticComponent<DialogTriggerProps & import("react").RefAttributes<HTMLButtonElement>>;
};
