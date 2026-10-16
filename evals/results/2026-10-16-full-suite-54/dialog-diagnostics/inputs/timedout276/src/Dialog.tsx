import {
  createContext,
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
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

import { isTopDialogLayer, registerDialogLayer } from './dialog-layer.js'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

type DialogContextValue = {
  contentElement: RefObject<HTMLDivElement | null>
  contentId: string
  descriptionId: string
  descriptionCount: number
  open: boolean
  registerDescription: () => () => void
  requestOpenChange: (open: boolean) => void
  titleId: string
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext(component: string) {
  const context = useContext(DialogContext)
  if (!context) throw new Error(`${component} must be rendered inside Dialog.Root`)
  return context
}

function useComposedRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return useCallback(
    (value: T | null) => {
      for (const ref of refs) {
        if (typeof ref === 'function') ref(value)
        else if (ref) ref.current = value
      }
    },
    refs,
  )
}

export type DialogRootProps = {
  children: ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  open?: boolean
}

export function DialogRoot({ children, defaultOpen = false, onOpenChange, open }: DialogRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const [descriptionCount, setDescriptionCount] = useState(0)
  const generatedId = useId()
  const contentElement = useRef<HTMLDivElement>(null)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : uncontrolledOpen
  const currentOpenRef = useRef(currentOpen)
  const onOpenChangeRef = useRef(onOpenChange)
  currentOpenRef.current = currentOpen
  onOpenChangeRef.current = onOpenChange

  const requestOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (currentOpenRef.current === nextOpen) return
      if (!isControlled) setUncontrolledOpen(nextOpen)
      onOpenChangeRef.current?.(nextOpen)
    },
    [isControlled],
  )

  const registerDescription = useCallback(() => {
    setDescriptionCount((count) => count + 1)
    return () => setDescriptionCount((count) => Math.max(0, count - 1))
  }, [])

  const context = useMemo<DialogContextValue>(
    () => ({
      contentElement,
      contentId: `dialog-${generatedId}`,
      descriptionId: `dialog-description-${generatedId}`,
      descriptionCount,
      open: currentOpen,
      registerDescription,
      requestOpenChange,
      titleId: `dialog-title-${generatedId}`,
    }),
    [
      currentOpen,
      descriptionCount,
      generatedId,
      registerDescription,
      requestOpenChange,
    ],
  )

  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>
}

export type DialogTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(function DialogTrigger(
  { disabled, onClick, type = 'button', ...props },
  forwardedRef,
) {
  const { contentId, open, requestOpenChange } = useDialogContext('Dialog.Trigger')

  return (
    <button
      {...props}
      ref={forwardedRef}
      aria-controls={open ? contentId : undefined}
      aria-expanded={open}
      aria-haspopup="dialog"
      data-state={open ? 'open' : 'closed'}
      disabled={disabled}
      type={type}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !disabled) requestOpenChange(true)
      }}
    />
  )
})

export type DialogPortalProps = {
  children: ReactNode
  container?: Element | DocumentFragment | null
}

export function DialogPortal({ children, container }: DialogPortalProps) {
  const { open } = useDialogContext('Dialog.Portal')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted || !open) return null

  return createPortal(<div data-dialog-portal="">{children}</div>, container ?? document.body)
}

export type DialogOverlayProps = HTMLAttributes<HTMLDivElement>

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(function DialogOverlay(
  { onPointerDown, ...props },
  forwardedRef,
) {
  const { contentElement, open, requestOpenChange } = useDialogContext('Dialog.Overlay')
  if (!open) return null

  return (
    <div
      {...props}
      ref={forwardedRef}
      data-state="open"
      onPointerDown={(event) => {
        onPointerDown?.(event)
        if (
          !event.defaultPrevented &&
          event.target === event.currentTarget &&
          isTopDialogLayer(contentElement.current)
        ) {
          event.preventDefault()
          requestOpenChange(false)
        }
      }}
    />
  )
})

export type DialogContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'role'> & {
  initialFocusRef?: RefObject<HTMLElement | null>
  onEscapeKeyDown?: (event: KeyboardEvent) => void
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
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
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const composedRef = useComposedRefs(forwardedRef, setElement)
  const escapeHandlerRef = useRef(onEscapeKeyDown)
  const initialFocusRefRef = useRef(initialFocusRef)
  escapeHandlerRef.current = onEscapeKeyDown
  initialFocusRefRef.current = initialFocusRef

  useIsomorphicLayoutEffect(() => {
    if (!context.open || !element) return
    context.contentElement.current = element
    const restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const unregister = registerDialogLayer({
      content: element,
      dismiss: () => context.requestOpenChange(false),
      initialFocus: () => initialFocusRefRef.current?.current ?? null,
      onEscapeKeyDown: (event) => escapeHandlerRef.current?.(event),
      restoreFocus,
    })

    return () => {
      if (context.contentElement.current === element) context.contentElement.current = null
      unregister()
    }
  }, [context.contentElement, context.open, context.requestOpenChange, element])

  if (!context.open) return null

  return (
    <div
      {...props}
      ref={composedRef}
      aria-describedby={ariaDescribedBy ?? (context.descriptionCount > 0 ? context.descriptionId : undefined)}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (!ariaLabel ? context.titleId : undefined)}
      aria-modal="true"
      data-state="open"
      id={context.contentId}
      role="dialog"
      tabIndex={tabIndex}
    />
  )
})

export type DialogTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, 'id'>

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(function DialogTitle(props, forwardedRef) {
  const { titleId } = useDialogContext('Dialog.Title')
  return <h2 {...props} ref={forwardedRef} id={titleId} />
})

export type DialogDescriptionProps = Omit<HTMLAttributes<HTMLParagraphElement>, 'id'>

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(function DialogDescription(
  props,
  forwardedRef,
) {
  const { descriptionId, registerDescription } = useDialogContext('Dialog.Description')
  useEffect(registerDescription, [registerDescription])
  return <p {...props} ref={forwardedRef} id={descriptionId} />
})

export type DialogCloseProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(
  { disabled, onClick, type = 'button', ...props },
  forwardedRef,
) {
  const { requestOpenChange } = useDialogContext('Dialog.Close')
  return (
    <button
      {...props}
      ref={forwardedRef}
      disabled={disabled}
      type={type}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && !disabled) requestOpenChange(false)
      }}
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
