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

type OpenChangeHandler = (open: boolean) => void

export type DialogRootProps = {
  children: ReactNode
  /** The initial state when the consumer does not control `open`. */
  defaultOpen?: boolean
  /** The source of truth for a controlled dialog. */
  open?: boolean
  onOpenChange?: OpenChangeHandler
}

type DialogContextValue = {
  contentId: string
  contentRef: MutableRefObject<HTMLDivElement | null>
  descriptionId: string
  layerToken: symbol
  open: boolean
  setOpen: OpenChangeHandler
  titleId: string
  triggerRef: MutableRefObject<HTMLButtonElement | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext(componentName: string) {
  const context = useContext(DialogContext)

  if (!context) {
    throw new Error(`${componentName} must be used inside Dialog.Root`)
  }

  return context
}

function useControllableOpen({
  defaultOpen = false,
  onOpenChange,
  open,
}: Pick<DialogRootProps, 'defaultOpen' | 'onOpenChange' | 'open'>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const controlled = open !== undefined
  const currentOpen = controlled ? open : uncontrolledOpen
  const currentOpenRef = useRef(currentOpen)
  const onOpenChangeRef = useRef(onOpenChange)

  currentOpenRef.current = currentOpen
  onOpenChangeRef.current = onOpenChange

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === currentOpenRef.current) return

      if (!controlled) {
        currentOpenRef.current = nextOpen
        setUncontrolledOpen(nextOpen)
      }

      onOpenChangeRef.current?.(nextOpen)
    },
    [controlled],
  )

  return [currentOpen, setOpen] as const
}

export function DialogRoot({
  children,
  defaultOpen,
  onOpenChange,
  open: controlledOpen,
}: DialogRootProps) {
  const [open, setOpen] = useControllableOpen({
    defaultOpen,
    onOpenChange,
    open: controlledOpen,
  })
  const reactId = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const layerToken = useRef(Symbol('dialog-layer')).current

  const context = useMemo<DialogContextValue>(
    () => ({
      contentId: `${reactId}-content`,
      contentRef,
      descriptionId: `${reactId}-description`,
      layerToken,
      open,
      setOpen,
      titleId: `${reactId}-title`,
      triggerRef,
    }),
    [layerToken, open, reactId, setOpen],
  )

  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref) {
    ref.current = value
  }
}

function useComposedRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return useCallback(
    (node: T | null) => {
      for (const ref of refs) setRef(ref, node)
    },
    // Ref identities supplied by React and callers are expected to be stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs,
  )
}

export type DialogTriggerProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-controls' | 'aria-expanded' | 'aria-haspopup'
>

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ onClick, type = 'button', ...props }, forwardedRef) {
    const context = useDialogContext('Dialog.Trigger')
    const ref = useComposedRefs(forwardedRef, context.triggerRef)

    return (
      <button
        {...props}
        aria-controls={context.contentId}
        aria-expanded={context.open}
        aria-haspopup="dialog"
        data-state={context.open ? 'open' : 'closed'}
        ref={ref}
        type={type}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) context.setOpen(true)
        }}
      />
    )
  },
)

export type DialogPortalProps = {
  children: ReactNode
  /** `undefined` uses `document.body`; `null` waits for a container. */
  container?: Element | DocumentFragment | null
}

export function DialogPortal({ children, container }: DialogPortalProps) {
  const { open } = useDialogContext('Dialog.Portal')
  const [browserReady, setBrowserReady] = useState(false)

  useEffect(() => setBrowserReady(true), [])

  if (!browserReady || !open) return null

  const portalContainer = container === undefined ? document.body : container
  return portalContainer ? createPortal(children, portalContainer) : null
}

type IsolationSnapshot = {
  ariaHidden: string | null
  inert: boolean
}

type DialogLayer = {
  content: HTMLElement
  dismiss: () => void
  token: symbol
}

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.hidden &&
      !element.matches(':disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.getClientRects().length > 0,
  )
}

function focusFirst(container: HTMLElement, preferred?: HTMLElement | null) {
  if (preferred?.isConnected && container.contains(preferred)) {
    preferred.focus({ preventScroll: true })
    if (container.ownerDocument.activeElement === preferred) return
  }

  const firstFocusable = getFocusableElements(container)[0]
  ;(firstFocusable ?? container).focus({ preventScroll: true })
}

class DialogLayerManager {
  private isolation = new Map<HTMLElement, IsolationSnapshot>()
  private layers: DialogLayer[] = []
  private listening = false

  constructor(private readonly document: Document) {}

  add(layer: DialogLayer) {
    this.layers = this.layers.filter(({ token }) => token !== layer.token)
    this.layers.push(layer)
    this.sync()
  }

  remove(token: symbol) {
    this.layers = this.layers.filter((layer) => layer.token !== token)
    this.sync()
  }

  isTop(token: symbol) {
    return this.layers.at(-1)?.token === token
  }

  private readonly handleFocusIn = (event: FocusEvent) => {
    const top = this.layers.at(-1)
    if (!top || top.content.contains(event.target as Node)) return

    focusFirst(top.content)
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return

    const top = this.layers.at(-1)
    if (!top) return

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      top.dismiss()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = getFocusableElements(top.content)
    const activeElement = this.document.activeElement

    if (focusable.length === 0) {
      event.preventDefault()
      top.content.focus({ preventScroll: true })
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const focusIsInside = activeElement !== null && top.content.contains(activeElement)

    if (!focusIsInside || (event.shiftKey && activeElement === first)) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus({ preventScroll: true })
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault()
      first.focus({ preventScroll: true })
    }
  }

  private restoreIsolation() {
    for (const [element, snapshot] of this.isolation) {
      if (snapshot.ariaHidden === null) element.removeAttribute('aria-hidden')
      else element.setAttribute('aria-hidden', snapshot.ariaHidden)
      element.inert = snapshot.inert
    }
    this.isolation.clear()
  }

  private isolateOutside(content: HTMLElement) {
    let branch: HTMLElement = content
    let parent = branch.parentElement

    while (parent) {
      for (const sibling of Array.from(parent.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === branch) continue

        this.isolation.set(sibling, {
          ariaHidden: sibling.getAttribute('aria-hidden'),
          inert: sibling.inert,
        })
        sibling.setAttribute('aria-hidden', 'true')
        sibling.inert = true
      }

      if (parent === this.document.body) break
      branch = parent
      parent = parent.parentElement
    }
  }

  private sync() {
    this.restoreIsolation()

    const top = this.layers.at(-1)
    if (top) this.isolateOutside(top.content)

    if (!this.listening && top) {
      this.document.addEventListener('focusin', this.handleFocusIn)
      this.document.addEventListener('keydown', this.handleKeyDown)
      this.listening = true
    } else if (this.listening && !top) {
      this.document.removeEventListener('focusin', this.handleFocusIn)
      this.document.removeEventListener('keydown', this.handleKeyDown)
      this.listening = false
    }
  }
}

const layerManagers = new WeakMap<Document, DialogLayerManager>()

function getLayerManager(document: Document) {
  let manager = layerManagers.get(document)
  if (!manager) {
    manager = new DialogLayerManager(document)
    layerManagers.set(document, manager)
  }
  return manager
}

const useBrowserLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect

export type DialogOverlayProps = HTMLAttributes<HTMLDivElement>

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  function DialogOverlay({ onClick, ...props }, forwardedRef) {
    const context = useDialogContext('Dialog.Overlay')

    if (!context.open) return null

    return (
      <div
        {...props}
        data-state="open"
        ref={forwardedRef}
        onClick={(event) => {
          onClick?.(event)
          if (
            !event.defaultPrevented &&
            event.target === event.currentTarget &&
            context.contentRef.current &&
            getLayerManager(context.contentRef.current.ownerDocument).isTop(context.layerToken)
          ) {
            context.setOpen(false)
          }
        }}
      />
    )
  },
)

export type DialogContentProps = Omit<HTMLAttributes<HTMLDivElement>, 'id' | 'role'> & {
  /** Focus this element on open when it is inside the content. */
  initialFocusRef?: RefObject<HTMLElement | null>
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    {
      'aria-describedby': ariaDescribedBy,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      initialFocusRef,
      tabIndex = -1,
      ...props
    },
    forwardedRef,
  ) {
    const context = useDialogContext('Dialog.Content')
    const ref = useComposedRefs(forwardedRef, context.contentRef)
    const dismissRef = useRef(() => context.setOpen(false))
    dismissRef.current = () => context.setOpen(false)

    useBrowserLayoutEffect(() => {
      const content = context.contentRef.current
      if (!context.open || !content) return

      const ownerDocument = content.ownerDocument
      const previouslyFocused =
        ownerDocument.activeElement instanceof HTMLElement
          ? ownerDocument.activeElement
          : context.triggerRef.current
      const manager = getLayerManager(ownerDocument)

      manager.add({
        content,
        dismiss: () => dismissRef.current(),
        token: context.layerToken,
      })
      focusFirst(content, initialFocusRef?.current)

      return () => {
        manager.remove(context.layerToken)
        queueMicrotask(() => {
          if (previouslyFocused?.isConnected) {
            previouslyFocused.focus({ preventScroll: true })
          }
        })
      }
    }, [context.layerToken, context.open, context.contentRef, context.triggerRef, initialFocusRef])

    if (!context.open) return null

    return (
      <div
        {...props}
        aria-describedby={ariaDescribedBy ?? context.descriptionId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : context.titleId)}
        aria-modal="true"
        data-state="open"
        id={context.contentId}
        ref={ref}
        role="dialog"
        tabIndex={tabIndex}
      />
    )
  },
)

export type DialogTitleProps = Omit<HTMLAttributes<HTMLHeadingElement>, 'id'>

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(function DialogTitle(
  props,
  forwardedRef,
) {
  const context = useDialogContext('Dialog.Title')
  return <h2 {...props} id={context.titleId} ref={forwardedRef} />
})

export type DialogDescriptionProps = Omit<HTMLAttributes<HTMLParagraphElement>, 'id'>

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  function DialogDescription(props, forwardedRef) {
    const context = useDialogContext('Dialog.Description')
    return <p {...props} id={context.descriptionId} ref={forwardedRef} />
  },
)

export type DialogCloseProps = ButtonHTMLAttributes<HTMLButtonElement>

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(
  { onClick, type = 'button', ...props },
  forwardedRef,
) {
  const context = useDialogContext('Dialog.Close')

  return (
    <button
      {...props}
      ref={forwardedRef}
      type={type}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.setOpen(false)
      }}
    />
  )
})

/** Compound export for ergonomic product call sites; all parts are also named exports. */
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
