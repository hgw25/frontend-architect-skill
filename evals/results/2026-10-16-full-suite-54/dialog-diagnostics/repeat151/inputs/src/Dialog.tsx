import {
  createContext,
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEventHandler,
  type PointerEventHandler,
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

import { registerDialogLayer } from './dialogManager.js'

export type DialogOpenChangeReason =
  | 'close-button'
  | 'escape-key'
  | 'outside-pointer'
  | 'trigger'

export type DialogOpenChangeDetails = {
  nativeEvent: Event
  reason: DialogOpenChangeReason
}

export type DialogRootProps = {
  children: ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: DialogOpenChangeDetails) => void
  open?: boolean
}

type DialogContextValue = {
  contentId: string
  descriptionId: string
  open: boolean
  setOpen: (open: boolean, details: DialogOpenChangeDetails) => void
  titleId: string
  triggerRef: RefObject<HTMLButtonElement | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)
const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect

function useDialogContext(componentName: string) {
  const context = useContext(DialogContext)
  if (!context) throw new Error(`${componentName} must be rendered inside Dialog.Root`)
  return context
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref) {
    ref.current = value
  }
}

function composeEventHandlers<EventType extends { defaultPrevented: boolean }>(
  consumerHandler: ((event: EventType) => void) | undefined,
  primitiveHandler: (event: EventType) => void,
) {
  return (event: EventType) => {
    consumerHandler?.(event)
    if (!event.defaultPrevented) primitiveHandler(event)
  }
}

export function DialogRoot({ children, defaultOpen = false, onOpenChange, open }: DialogRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : uncontrolledOpen
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentId = useId()
  const titleId = useId()
  const descriptionId = useId()

  const setOpen = useCallback(
    (nextOpen: boolean, details: DialogOpenChangeDetails) => {
      if (nextOpen === currentOpen) return
      if (!isControlled) setUncontrolledOpen(nextOpen)
      onOpenChange?.(nextOpen, details)
    },
    [currentOpen, isControlled, onOpenChange],
  )

  const context = useMemo<DialogContextValue>(
    () => ({
      contentId,
      descriptionId,
      open: currentOpen,
      setOpen,
      titleId,
      triggerRef,
    }),
    [contentId, currentOpen, descriptionId, setOpen, titleId],
  )

  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>
}

export type DialogTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ onClick, type = 'button', ...props }, forwardedRef) {
    const { contentId, open, setOpen, triggerRef } = useDialogContext('Dialog.Trigger')
    const composedRef = useCallback(
      (element: HTMLButtonElement | null) => {
        triggerRef.current = element
        setRef(forwardedRef, element)
      },
      [forwardedRef, triggerRef],
    )
    const handleClick: MouseEventHandler<HTMLButtonElement> = composeEventHandlers(
      onClick,
      (event) => setOpen(true, { nativeEvent: event.nativeEvent, reason: 'trigger' }),
    )

    return (
      <button
        {...props}
        ref={composedRef}
        type={type}
        aria-controls={contentId}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-state={open ? 'open' : 'closed'}
        onClick={handleClick}
      />
    )
  },
)

export type DialogPortalProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode
  container?: Element | DocumentFragment
}

export function DialogPortal({ children, container, ...wrapperProps }: DialogPortalProps) {
  const { open } = useDialogContext('Dialog.Portal')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted || !open) return null

  return createPortal(
    <div {...wrapperProps} data-dialog-portal="" data-state="open">
      {children}
    </div>,
    container ?? document.body,
  )
}

export type DialogOverlayProps = HTMLAttributes<HTMLDivElement>

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  function DialogOverlay({ onPointerDown, ...props }, forwardedRef) {
    const { open, setOpen } = useDialogContext('Dialog.Overlay')
    const handlePointerDown: PointerEventHandler<HTMLDivElement> = composeEventHandlers(
      onPointerDown,
      (event) => {
        if (event.button === 0 && event.target === event.currentTarget) {
          setOpen(false, { nativeEvent: event.nativeEvent, reason: 'outside-pointer' })
        }
      },
    )

    if (!open) return null

    return (
      <div
        {...props}
        ref={forwardedRef}
        data-dialog-overlay=""
        data-state="open"
        onPointerDown={handlePointerDown}
      />
    )
  },
)

export type DialogContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'role'> & {
  initialFocusRef?: RefObject<HTMLElement | null>
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  restoreFocus?: boolean
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(allProps, forwardedRef) {
    const hasAriaDescribedBy = Object.hasOwn(allProps, 'aria-describedby')
    const hasAriaLabelledBy = Object.hasOwn(allProps, 'aria-labelledby')
    const {
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-labelledby': ariaLabelledBy,
      initialFocusRef,
      onEscapeKeyDown,
      restoreFocus = true,
      tabIndex = -1,
      ...props
    } = allProps
    const { contentId, descriptionId, open, setOpen, titleId, triggerRef } =
      useDialogContext('Dialog.Content')
    const [content, setContent] = useState<HTMLDivElement | null>(null)
    const setOpenRef = useRef(setOpen)
    const onEscapeKeyDownRef = useRef(onEscapeKeyDown)
    setOpenRef.current = setOpen
    onEscapeKeyDownRef.current = onEscapeKeyDown

    const composedRef = useCallback(
      (element: HTMLDivElement | null) => {
        setContent(element)
        setRef(forwardedRef, element)
      },
      [forwardedRef],
    )

    useIsomorphicLayoutEffect(() => {
      if (!open || !content) return
      const activeElement = content.ownerDocument.activeElement
      const HTMLElementConstructor = content.ownerDocument.defaultView?.HTMLElement

      return registerDialogLayer({
        content,
        fallbackReturnFocus: () => triggerRef.current,
        initialFocus: initialFocusRef?.current ?? null,
        onEscapeKeyDown: (event) => {
          onEscapeKeyDownRef.current?.(event)
          if (!event.defaultPrevented) {
            event.preventDefault()
            setOpenRef.current(false, { nativeEvent: event, reason: 'escape-key' })
          }
        },
        restoreFocus,
        returnFocus:
          HTMLElementConstructor && activeElement instanceof HTMLElementConstructor
            ? activeElement
            : triggerRef.current,
      })
    }, [content, initialFocusRef, open, restoreFocus, triggerRef])

    if (!open) return null

    return (
      <div
        {...props}
        ref={composedRef}
        id={contentId}
        role="dialog"
        aria-label={ariaLabel}
        aria-describedby={hasAriaDescribedBy ? ariaDescribedBy : descriptionId}
        aria-labelledby={hasAriaLabelledBy || ariaLabel ? ariaLabelledBy : titleId}
        aria-modal="true"
        data-dialog-content=""
        data-state="open"
        tabIndex={tabIndex}
      />
    )
  },
)

export type DialogTitleProps = HTMLAttributes<HTMLHeadingElement>

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  function DialogTitle(props, forwardedRef) {
    const { titleId } = useDialogContext('Dialog.Title')
    return <h2 {...props} ref={forwardedRef} id={titleId} data-dialog-title="" />
  },
)

export type DialogDescriptionProps = HTMLAttributes<HTMLParagraphElement>

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  function DialogDescription(props, forwardedRef) {
    const { descriptionId } = useDialogContext('Dialog.Description')
    return <p {...props} ref={forwardedRef} id={descriptionId} data-dialog-description="" />
  },
)

export type DialogCloseProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose({ onClick, type = 'button', ...props }, forwardedRef) {
    const { setOpen } = useDialogContext('Dialog.Close')
    const handleClick: MouseEventHandler<HTMLButtonElement> = composeEventHandlers(
      onClick,
      (event) => setOpen(false, { nativeEvent: event.nativeEvent, reason: 'close-button' }),
    )

    return <button {...props} ref={forwardedRef} type={type} onClick={handleClick} />
  },
)

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
