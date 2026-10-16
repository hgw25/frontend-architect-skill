'use client'

import {
  createContext,
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
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

import { isTopDialogLayer, mountFocusScope } from './focusScope'

export type DialogOpenChangeReason =
  | 'trigger'
  | 'close-button'
  | 'escape-key'
  | 'outside-interaction'

export type DialogOpenChangeDetails = { reason: DialogOpenChangeReason }

type DialogRootBaseProps = {
  children: ReactNode
  onOpenChange?: (open: boolean, details: DialogOpenChangeDetails) => void
}

export type DialogRootProps = DialogRootBaseProps &
  ({ defaultOpen?: boolean; open?: never } | { defaultOpen?: never; open: boolean })

type DialogContextValue = {
  contentId: string
  contentRef: RefObject<HTMLDivElement | null>
  descriptionId: string
  open: boolean
  setOpen: (open: boolean, reason: DialogOpenChangeReason) => void
  titleId: string
  triggerRef: RefObject<HTMLButtonElement | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)
const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect

function useDialogContext(componentName: string) {
  const context = useContext(DialogContext)
  if (!context) throw new Error(`${componentName} must be rendered inside Dialog.Root.`)
  return context
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

function useComposedRef<T>(...refs: Array<Ref<T> | undefined>) {
  return useCallback((value: T | null) => {
    for (const ref of refs) assignRef(ref, value)
  }, refs)
}

export function DialogRoot({
  children,
  defaultOpen = false,
  onOpenChange,
  open: controlledOpen,
}: DialogRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const contentId = useId()
  const titleId = useId()
  const descriptionId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const setOpen = useCallback(
    (nextOpen: boolean, reason: DialogOpenChangeReason) => {
      if (!isControlled) setUncontrolledOpen(nextOpen)
      if (nextOpen !== open) onOpenChange?.(nextOpen, { reason })
    },
    [isControlled, onOpenChange, open],
  )

  const value = useMemo<DialogContextValue>(
    () => ({
      contentId,
      contentRef,
      descriptionId,
      open,
      setOpen,
      titleId,
      triggerRef,
    }),
    [contentId, descriptionId, open, setOpen, titleId],
  )

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

export type DialogTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ onClick, type = 'button', ...props }, forwardedRef) {
    const context = useDialogContext('Dialog.Trigger')
    const ref = useComposedRef(forwardedRef, context.triggerRef)

    function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
      onClick?.(event)
      if (!event.defaultPrevented) context.setOpen(true, 'trigger')
    }

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        aria-controls={context.contentId}
        aria-expanded={context.open}
        aria-haspopup="dialog"
        data-state={context.open ? 'open' : 'closed'}
        onClick={handleClick}
      />
    )
  },
)

export type DialogPortalProps = {
  children: ReactNode
  container?: Element | DocumentFragment | null
}

export function DialogPortal({ children, container }: DialogPortalProps) {
  const context = useDialogContext('Dialog.Portal')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!context.open || !mounted) return null
  return createPortal(children, container ?? document.body)
}

export type DialogOverlayProps = HTMLAttributes<HTMLDivElement>

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  function DialogOverlay({ onClick, ...props }, forwardedRef) {
    const context = useDialogContext('Dialog.Overlay')

    function handleClick(event: ReactMouseEvent<HTMLDivElement>) {
      onClick?.(event)
      if (
        !event.defaultPrevented &&
        event.target === event.currentTarget &&
        isTopDialogLayer(context.contentRef.current)
      ) {
        context.setOpen(false, 'outside-interaction')
      }
    }

    if (!context.open) return null
    return <div {...props} ref={forwardedRef} data-state="open" onClick={handleClick} />
  },
)

export type DialogContentProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'aria-label' | 'aria-modal' | 'id' | 'role'
> & {
  'aria-label'?: string
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
      tabIndex = -1,
      ...props
    },
    forwardedRef,
  ) {
    const context = useDialogContext('Dialog.Content')
    const ref = useComposedRef(forwardedRef, context.contentRef)

    useIsomorphicLayoutEffect(() => {
      if (!context.open) return

      return mountFocusScope({
        contentRef: context.contentRef,
        initialFocusRef,
        onDismiss: () => context.setOpen(false, 'escape-key'),
        onEscapeKeyDown,
      })
    }, [context.contentRef, context.open, context.setOpen, initialFocusRef, onEscapeKeyDown])

    if (!context.open) return null
    return (
      <div
        {...props}
        ref={ref}
        id={context.contentId}
        role="dialog"
        aria-describedby={ariaDescribedBy ?? context.descriptionId}
        aria-label={ariaLabel}
        aria-labelledby={
          ariaLabel !== undefined ? undefined : (ariaLabelledBy ?? context.titleId)
        }
        aria-modal="true"
        data-state="open"
        tabIndex={tabIndex}
      />
    )
  },
)

export type DialogTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, 'id'>

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  function DialogTitle(props, forwardedRef) {
    const context = useDialogContext('Dialog.Title')
    return <h2 {...props} ref={forwardedRef} id={context.titleId} />
  },
)

export type DialogDescriptionProps = Omit<HTMLAttributes<HTMLParagraphElement>, 'id'>

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  function DialogDescription(props, forwardedRef) {
    const context = useDialogContext('Dialog.Description')
    return <p {...props} ref={forwardedRef} id={context.descriptionId} />
  },
)

export type DialogCloseProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose({ onClick, type = 'button', ...props }, forwardedRef) {
    const context = useDialogContext('Dialog.Close')

    function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
      onClick?.(event)
      if (!event.defaultPrevented) context.setOpen(false, 'close-button')
    }

    return <button {...props} ref={forwardedRef} type={type} onClick={handleClick} />
  },
)

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
} as const
