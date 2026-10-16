import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { mountDialogLayer } from './dialog-layer'

type OpenChangeHandler = (open: boolean) => void

export type DialogRootProps = {
  children: ReactNode
  defaultOpen?: boolean
  onOpenChange?: OpenChangeHandler
  open?: boolean
}

type DialogContextValue = {
  contentId: string
  descriptionId: string
  open: boolean
  setOpen: OpenChangeHandler
  titleId: string
  triggerRef: MutableRefObject<HTMLButtonElement | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)
const PortalContext = createContext<HTMLElement | null>(null)

function useDialogContext(componentName: string) {
  const context = useContext(DialogContext)

  if (!context) {
    throw new Error(`${componentName} must be rendered inside Dialog.Root`)
  }

  return context
}

function useControllableOpen({
  defaultOpen = false,
  onOpenChange,
  open,
}: Pick<DialogRootProps, 'defaultOpen' | 'onOpenChange' | 'open'>) {
  const controlled = open !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const currentOpen = controlled ? open : uncontrolledOpen
  const currentOpenRef = useRef(currentOpen)
  currentOpenRef.current = currentOpen

  const setOpen = useCallback<OpenChangeHandler>(
    (nextOpen) => {
      if (nextOpen === currentOpenRef.current) return

      if (!controlled) setUncontrolledOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [controlled, onOpenChange],
  )

  return [currentOpen, setOpen] as const
}

export function DialogRoot({
  children,
  defaultOpen,
  onOpenChange,
  open,
}: DialogRootProps) {
  const [currentOpen, setOpen] = useControllableOpen({
    defaultOpen,
    onOpenChange,
    open,
  })
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  return (
    <DialogContext.Provider
      value={{
        contentId: `${id}-content`,
        descriptionId: `${id}-description`,
        open: currentOpen,
        setOpen,
        titleId: `${id}-title`,
        triggerRef,
      }}
    >
      {children}
    </DialogContext.Provider>
  )
}

function setRefs<T>(value: T, ...refs: Array<Ref<T> | undefined>) {
  for (const ref of refs) {
    if (typeof ref === 'function') ref(value)
    else if (ref) ref.current = value
  }
}

export type DialogTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ onClick, type = 'button', ...props }, forwardedRef) {
    const { contentId, open, setOpen, triggerRef } =
      useDialogContext('Dialog.Trigger')

    return (
      <button
        {...props}
        aria-controls={contentId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) setOpen(true)
        }}
        ref={(node) => setRefs(node, triggerRef, forwardedRef)}
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
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    const target = container ?? document.body
    const node = target.ownerDocument.createElement('div')
    node.dataset.dialogPortal = ''
    target.appendChild(node)
    setPortalNode(node)

    return () => {
      setPortalNode(null)
      node.remove()
    }
  }, [container, open])

  if (!open || !portalNode) return null

  return createPortal(
    <PortalContext.Provider value={portalNode}>
      {children}
    </PortalContext.Provider>,
    portalNode,
  )
}

function useLatest<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}

export type DialogOverlayProps = HTMLAttributes<HTMLDivElement>

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  function DialogOverlay(props, ref) {
    const { open } = useDialogContext('Dialog.Overlay')
    if (!open) return null
    return <div {...props} ref={ref} />
  },
)

export type DialogContentProps = HTMLAttributes<HTMLDivElement> & {
  finalFocusRef?: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
  onCloseAutoFocus?: (event: Event) => void
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  onOpenAutoFocus?: (event: Event) => void
  onPointerDownOutside?: (event: PointerEvent) => void
}

const useBrowserLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    {
      'aria-describedby': ariaDescribedBy,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      finalFocusRef,
      initialFocusRef,
      onCloseAutoFocus,
      onEscapeKeyDown,
      onKeyDown,
      onOpenAutoFocus,
      onPointerDownOutside,
      role = 'dialog',
      tabIndex = -1,
      ...props
    },
    forwardedRef,
  ) {
    const {
      contentId,
      descriptionId,
      open,
      setOpen,
      titleId,
      triggerRef,
    } = useDialogContext('Dialog.Content')
    const portalNode = useContext(PortalContext)
    const contentRef = useRef<HTMLDivElement | null>(null)
    const behaviorRef = useLatest({
      finalFocusRef,
      initialFocusRef,
      onCloseAutoFocus,
      onEscapeKeyDown,
      onOpenAutoFocus,
      onPointerDownOutside,
      setOpen,
    })

    useBrowserLayoutEffect(() => {
      const content = contentRef.current
      if (!open || !content) return

      const restoreTarget =
        behaviorRef.current.finalFocusRef?.current ?? triggerRef.current
      return mountDialogLayer({
        content,
        initialFocus: behaviorRef.current.initialFocusRef?.current,
        onCloseAutoFocus: (event) =>
          behaviorRef.current.onCloseAutoFocus?.(event),
        onDismiss: () => behaviorRef.current.setOpen(false),
        onEscapeKeyDown: (event) =>
          behaviorRef.current.onEscapeKeyDown?.(event),
        onOpenAutoFocus: (event) =>
          behaviorRef.current.onOpenAutoFocus?.(event),
        onPointerDownOutside: (event) =>
          behaviorRef.current.onPointerDownOutside?.(event),
        portal: portalNode ?? content,
        restoreFocus: restoreTarget,
      })
    }, [
      behaviorRef,
      open,
      portalNode,
      triggerRef,
    ])

    if (!open) return null

    return (
      <div
        {...props}
        aria-describedby={ariaDescribedBy ?? descriptionId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? ariaLabelledBy : (ariaLabelledBy ?? titleId)}
        aria-modal="true"
        id={contentId}
        onKeyDown={onKeyDown}
        ref={(node) => {
          contentRef.current = node
          setRefs(node, forwardedRef)
        }}
        role={role}
        tabIndex={tabIndex}
      />
    )
  },
)

export type DialogTitleProps = HTMLAttributes<HTMLHeadingElement>

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  function DialogTitle({ id, ...props }, ref) {
    const { titleId } = useDialogContext('Dialog.Title')
    return <h2 {...props} id={id ?? titleId} ref={ref} />
  },
)

export type DialogDescriptionProps = HTMLAttributes<HTMLParagraphElement>

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(function DialogDescription({ id, ...props }, ref) {
  const { descriptionId } = useDialogContext('Dialog.Description')
  return <p {...props} id={id ?? descriptionId} ref={ref} />
})

export type DialogCloseProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose({ onClick, type = 'button', ...props }, ref) {
    const { setOpen } = useDialogContext('Dialog.Close')
    return (
      <button
        {...props}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) setOpen(false)
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
} as const
