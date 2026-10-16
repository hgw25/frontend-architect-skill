import {
  createContext,
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { focusDialog, registerDialogLayer } from './dialog/focus-stack'

export type DialogOpenChangeHandler = (open: boolean) => void

export type DialogRootProps = {
  children: ReactNode
  defaultOpen?: boolean
  onOpenChange?: DialogOpenChangeHandler
  open?: boolean
}

type DialogContextValue = {
  contentId: string
  descriptionId: string
  open: boolean
  setOpen: DialogOpenChangeHandler
  titleId: string
  triggerRef: RefObject<HTMLButtonElement | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext(part: string) {
  const context = useContext(DialogContext)
  if (!context) throw new Error(`Dialog.${part} must be rendered inside Dialog.Root`)
  return context
}

export function DialogRoot({
  children,
  defaultOpen = false,
  onOpenChange,
  open: controlledOpen,
}: DialogRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  const isControlled = controlledOpen !== undefined
  const contentId = useId()
  const titleId = useId()
  const descriptionId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)

  const setOpen = useCallback<DialogOpenChangeHandler>(
    (nextOpen) => {
      if (nextOpen === open) return
      if (!isControlled) setUncontrolledOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange, open],
  )

  const value = useMemo(
    () => ({ contentId, descriptionId, open, setOpen, titleId, triggerRef }),
    [contentId, descriptionId, open, setOpen, titleId],
  )

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

function setRefs<T>(value: T, refs: Array<Ref<T> | undefined>) {
  for (const ref of refs) {
    if (typeof ref === 'function') ref(value)
    else if (ref) ref.current = value
  }
}

function composeClickHandlers(
  consumerHandler: MouseEventHandler<HTMLElement> | undefined,
  primitiveHandler: () => void,
): MouseEventHandler<HTMLElement> {
  return (event) => {
    consumerHandler?.(event)
    if (!event.defaultPrevented) primitiveHandler()
  }
}

export type DialogTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ onClick, type = 'button', ...props }, forwardedRef) {
    const context = useDialogContext('Trigger')
    return (
      <button
        {...props}
        aria-controls={context.open ? context.contentId : undefined}
        aria-expanded={context.open}
        aria-haspopup="dialog"
        onClick={composeClickHandlers(onClick, () => context.setOpen(true))}
        ref={(node) => setRefs(node, [context.triggerRef, forwardedRef])}
        type={type}
      />
    )
  },
)

export type DialogPortalProps = {
  children: ReactNode
  container?: Element | DocumentFragment
}

export function DialogPortal({ children, container }: DialogPortalProps) {
  const { open } = useDialogContext('Portal')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted || !open) return null
  return createPortal(children, container ?? document.body)
}

export type DialogOverlayProps = HTMLAttributes<HTMLDivElement>

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  function DialogOverlay({ onClick, ...props }, forwardedRef) {
    const context = useDialogContext('Overlay')
    if (!context.open) return null

    return (
      <div
        {...props}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented && event.target === event.currentTarget) {
            context.setOpen(false)
          }
        }}
        ref={forwardedRef}
      />
    )
  },
)

export type DialogContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'id'> & {
  initialFocusRef?: RefObject<HTMLElement | null>
  onEscapeKeyDown?: (event: KeyboardEvent) => void
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    {
      'aria-describedby': ariaDescribedBy,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      initialFocusRef,
      onEscapeKeyDown,
      ...props
    },
    forwardedRef,
  ) {
    const context = useDialogContext('Content')
    const contentRef = useRef<HTMLDivElement>(null)
    const restoreFocusRef = useRef<HTMLElement | null>(null)
    const setOpenRef = useRef(context.setOpen)
    const escapeHandlerRef = useRef(onEscapeKeyDown)
    setOpenRef.current = context.setOpen
    escapeHandlerRef.current = onEscapeKeyDown

    useLayoutEffect(() => {
      const content = contentRef.current
      if (!context.open || !content) return

      restoreFocusRef.current = content.ownerDocument.activeElement as HTMLElement | null
      const layer = {
        content,
        initialFocusRef,
        onEscapeKeyDown: (event: KeyboardEvent) => escapeHandlerRef.current?.(event),
        requestClose: () => setOpenRef.current(false),
      }
      const unregister = registerDialogLayer(layer)
      focusDialog(layer)

      return () => {
        unregister()
        const restoreTarget = context.triggerRef.current ?? restoreFocusRef.current
        if (restoreTarget?.isConnected) restoreTarget.focus({ preventScroll: true })
      }
    }, [context.open, context.triggerRef, initialFocusRef])

    if (!context.open) return null

    return (
      <div
        {...props}
        aria-describedby={ariaDescribedBy ?? context.descriptionId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : context.titleId)}
        aria-modal="true"
        id={context.contentId}
        ref={(node) => setRefs(node, [contentRef, forwardedRef])}
        role="dialog"
        tabIndex={props.tabIndex ?? -1}
      />
    )
  },
)

export type DialogTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, 'id'>

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  function DialogTitle(props, forwardedRef) {
    const context = useDialogContext('Title')
    return <h2 {...props} id={context.titleId} ref={forwardedRef} />
  },
)

export type DialogDescriptionProps = Omit<HTMLAttributes<HTMLParagraphElement>, 'id'>

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  function DialogDescription(props, forwardedRef) {
    const context = useDialogContext('Description')
    return <p {...props} id={context.descriptionId} ref={forwardedRef} />
  },
)

export type DialogCloseProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(
  { onClick, type = 'button', ...props },
  forwardedRef,
) {
  const context = useDialogContext('Close')
  return (
    <button
      {...props}
      onClick={composeClickHandlers(onClick, () => context.setOpen(false))}
      ref={forwardedRef}
      type={type}
    />
  )
})

export const Dialog = {
  Close: DialogClose,
  Content: DialogContent,
  Description: DialogDescription,
  Overlay: DialogOverlay,
  Portal: DialogPortal,
  Root: DialogRoot,
  Title: DialogTitle,
  Trigger: DialogTrigger,
}
