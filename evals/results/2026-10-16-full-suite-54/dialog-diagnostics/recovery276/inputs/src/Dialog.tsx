'use client'

import {
  createContext,
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MutableRefObject,
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

import { containTabFocus, focusInitialElement } from './dialog/focus'
import { isTopDialogLayer, registerDialogLayer } from './dialog/layers'

export type DialogOpenChangeReason =
  | 'close-button'
  | 'escape-key'
  | 'outside-pointer'
  | 'trigger'

export type DialogRootProps = {
  children: ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, reason: DialogOpenChangeReason) => void
  open?: boolean
}

type DialogContextValue = {
  contentId: string
  descriptionId: string
  hasDescription: boolean
  open: boolean
  registerDescription: () => () => void
  requestOpenChange: (open: boolean, reason: DialogOpenChangeReason) => void
  titleId: string
  triggerRef: MutableRefObject<HTMLButtonElement | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)
const PortalContext = createContext<HTMLElement | null>(null)
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function useDialogContext(component: string) {
  const context = useContext(DialogContext)
  if (!context) throw new Error(`${component} must be used inside Dialog.Root`)
  return context
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}

export function DialogRoot({ children, defaultOpen = false, onOpenChange, open }: DialogRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const [descriptionCount, setDescriptionCount] = useState(0)
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : uncontrolledOpen
  const contentId = useId()
  const titleId = useId()
  const descriptionId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const openChangeHandlerRef = useRef(onOpenChange)
  openChangeHandlerRef.current = onOpenChange

  const requestOpenChange = useCallback(
    (nextOpen: boolean, reason: DialogOpenChangeReason) => {
      if (!isControlled) setUncontrolledOpen(nextOpen)
      openChangeHandlerRef.current?.(nextOpen, reason)
    },
    [isControlled],
  )

  const registerDescription = useCallback(() => {
    setDescriptionCount((count) => count + 1)
    return () => setDescriptionCount((count) => Math.max(0, count - 1))
  }, [])

  const value = useMemo<DialogContextValue>(
    () => ({
      contentId,
      descriptionId,
      hasDescription: descriptionCount > 0,
      open: currentOpen,
      registerDescription,
      requestOpenChange,
      titleId,
      triggerRef,
    }),
    [
      contentId,
      currentOpen,
      descriptionCount,
      descriptionId,
      registerDescription,
      requestOpenChange,
      titleId,
    ],
  )

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

export type DialogTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ onClick, type = 'button', ...props }, forwardedRef) {
    const context = useDialogContext('Dialog.Trigger')

    return (
      <button
        {...props}
        aria-controls={context.contentId}
        aria-expanded={context.open}
        aria-haspopup="dialog"
        data-state={context.open ? 'open' : 'closed'}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) context.requestOpenChange(true, 'trigger')
        }}
        ref={(node) => {
          context.triggerRef.current = node
          assignRef(forwardedRef, node)
        }}
        type={type}
      />
    )
  },
)

export type DialogPortalProps = {
  children: ReactNode
  container?: HTMLElement | null
}

export function DialogPortal({ children, container }: DialogPortalProps) {
  const { open } = useDialogContext('Dialog.Portal')
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)

  useIsomorphicLayoutEffect(() => {
    if (!open) return
    const ownerDocument = container?.ownerDocument ?? document
    const host = ownerDocument.createElement('div')
    host.dataset.dialogPortal = ''
    ;(container ?? ownerDocument.body).append(host)
    setPortalHost(host)

    return () => {
      setPortalHost(null)
      host.remove()
    }
  }, [container, open])

  if (!open || !portalHost) return null
  return createPortal(
    <PortalContext.Provider value={portalHost}>{children}</PortalContext.Provider>,
    portalHost,
  )
}

export type DialogOverlayProps = HTMLAttributes<HTMLDivElement>

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  function DialogOverlay(props, ref) {
    const { open } = useDialogContext('Dialog.Overlay')
    return open ? <div {...props} data-state="open" ref={ref} /> : null
  },
)

export type DialogContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'id' | 'role'> & {
  initialFocusRef?: RefObject<HTMLElement | null>
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  onPointerDownOutside?: (event: PointerEvent) => void
  role?: 'alertdialog' | 'dialog'
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    {
      'aria-describedby': ariaDescribedBy,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      initialFocusRef,
      onEscapeKeyDown,
      onPointerDownOutside,
      role = 'dialog',
      tabIndex = -1,
      ...props
    },
    forwardedRef,
  ) {
    const context = useDialogContext('Dialog.Content')
    const portalHost = useContext(PortalContext)
    const contentRef = useRef<HTMLDivElement | null>(null)
    const layerId = useRef(Symbol('dialog-layer'))
    const escapeHandlerRef = useRef(onEscapeKeyDown)
    const outsideHandlerRef = useRef(onPointerDownOutside)
    escapeHandlerRef.current = onEscapeKeyDown
    outsideHandlerRef.current = onPointerDownOutside

    useIsomorphicLayoutEffect(() => {
      const content = contentRef.current
      if (!context.open || !content) return

      const ownerDocument = content.ownerDocument
      const previouslyFocused = ownerDocument.activeElement as HTMLElement | null
      const unregister = registerDialogLayer({ content, id: layerId.current, portalHost })

      focusInitialElement(content, initialFocusRef?.current)

      const handleKeyDown = (event: KeyboardEvent) => {
        if (!isTopDialogLayer(layerId.current)) return
        if (event.key === 'Tab') {
          containTabFocus(event, content)
          return
        }
        if (event.key !== 'Escape') return

        escapeHandlerRef.current?.(event)
        if (event.defaultPrevented) return
        event.preventDefault()
        event.stopImmediatePropagation()
        context.requestOpenChange(false, 'escape-key')
      }

      const handleFocusIn = (event: FocusEvent) => {
        if (!isTopDialogLayer(layerId.current) || content.contains(event.target as Node)) return
        focusInitialElement(content, initialFocusRef?.current)
      }

      const handlePointerDown = (event: PointerEvent) => {
        if (!isTopDialogLayer(layerId.current) || content.contains(event.target as Node)) return
        outsideHandlerRef.current?.(event)
        if (event.defaultPrevented) return
        context.requestOpenChange(false, 'outside-pointer')
      }

      ownerDocument.addEventListener('keydown', handleKeyDown, true)
      ownerDocument.addEventListener('focusin', handleFocusIn, true)
      ownerDocument.addEventListener('pointerdown', handlePointerDown, true)

      return () => {
        ownerDocument.removeEventListener('keydown', handleKeyDown, true)
        ownerDocument.removeEventListener('focusin', handleFocusIn, true)
        ownerDocument.removeEventListener('pointerdown', handlePointerDown, true)
        unregister()

        const fallback = context.triggerRef.current
        const returnTarget = previouslyFocused?.isConnected ? previouslyFocused : fallback
        returnTarget?.focus({ preventScroll: true })
      }
    }, [context.open, context.requestOpenChange, context.triggerRef, initialFocusRef, portalHost])

    if (!context.open) return null

    return (
      <div
        {...props}
        aria-describedby={ariaDescribedBy ?? (context.hasDescription ? context.descriptionId : undefined)}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : context.titleId)}
        aria-modal="true"
        data-state="open"
        id={context.contentId}
        ref={(node) => {
          contentRef.current = node
          assignRef(forwardedRef, node)
        }}
        role={role}
        tabIndex={tabIndex}
      />
    )
  },
)

export type DialogTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, 'id'>

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  function DialogTitle(props, ref) {
    const context = useDialogContext('Dialog.Title')
    return <h2 {...props} id={context.titleId} ref={ref} />
  },
)

export type DialogDescriptionProps = Omit<HTMLAttributes<HTMLParagraphElement>, 'id'>

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  function DialogDescription(props, ref) {
    const context = useDialogContext('Dialog.Description')

    useIsomorphicLayoutEffect(() => context.registerDescription(), [context.registerDescription])
    return <p {...props} id={context.descriptionId} ref={ref} />
  },
)

export type DialogCloseProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose({ onClick, type = 'button', ...props }, ref) {
    const context = useDialogContext('Dialog.Close')

    return (
      <button
        {...props}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) context.requestOpenChange(false, 'close-button')
        }}
        ref={ref}
        type={type}
      />
    )
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
