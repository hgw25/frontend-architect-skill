type DialogLayer = {
  content: HTMLElement
  fallbackReturnFocus: () => HTMLElement | null
  initialFocus: HTMLElement | null
  onEscapeKeyDown: (event: KeyboardEvent) => void
  restoreFocus: boolean
  returnFocus: HTMLElement | null
}

type HiddenElementState = {
  ariaHidden: string | null
  inert: boolean
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
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function isTabbable(element: HTMLElement) {
  const view = element.ownerDocument.defaultView
  const style = view?.getComputedStyle(element)

  return (
    !element.hidden &&
    !element.matches(':disabled') &&
    !element.closest('[inert]') &&
    element.getAttribute('aria-hidden') !== 'true' &&
    style?.display !== 'none' &&
    style?.visibility !== 'hidden' &&
    element.getClientRects().length > 0
  )
}

function getTabbableElements(content: HTMLElement) {
  return Array.from(content.querySelectorAll<HTMLElement>(focusableSelector)).filter(isTabbable)
}

function focusElement(element: HTMLElement) {
  element.focus({ preventScroll: true })
}

function focusInitialElement(layer: DialogLayer) {
  const requestedTarget = layer.initialFocus
  if (requestedTarget && layer.content.contains(requestedTarget) && isTabbable(requestedTarget)) {
    focusElement(requestedTarget)
    return
  }

  const autofocusTarget = layer.content.querySelector<HTMLElement>('[autofocus]')
  if (autofocusTarget && isTabbable(autofocusTarget)) {
    focusElement(autofocusTarget)
    return
  }

  const firstTarget = getTabbableElements(layer.content)[0]
  focusElement(firstTarget ?? layer.content)
}

class DialogManager {
  private layers: DialogLayer[] = []
  private hiddenElements = new Map<HTMLElement, HiddenElementState>()
  private mutationObserver: MutationObserver | null = null
  private originalBodyOverflow: string | null = null

  constructor(private readonly document: Document) {}

  add(layer: DialogLayer) {
    if (this.layers.length === 0) {
      this.document.addEventListener('keydown', this.handleKeyDown, true)
      this.document.addEventListener('focusin', this.handleFocusIn, true)
      this.originalBodyOverflow = this.document.body.style.overflow
      this.document.body.style.overflow = 'hidden'
      const MutationObserverConstructor = this.document.defaultView?.MutationObserver
      if (MutationObserverConstructor) {
        this.mutationObserver = new MutationObserverConstructor(() => this.updateOutsideElements())
        this.mutationObserver.observe(this.document.body, { childList: true, subtree: true })
      }
    }

    this.layers.push(layer)
    this.updateOutsideElements()
    focusInitialElement(layer)

    return () => this.remove(layer)
  }

  private remove(layer: DialogLayer) {
    const layerIndex = this.layers.indexOf(layer)
    if (layerIndex === -1) return

    const wasTopLayer = layerIndex === this.layers.length - 1
    this.layers.splice(layerIndex, 1)
    this.updateOutsideElements()

    if (this.layers.length === 0) {
      this.document.removeEventListener('keydown', this.handleKeyDown, true)
      this.document.removeEventListener('focusin', this.handleFocusIn, true)
      this.mutationObserver?.disconnect()
      this.mutationObserver = null
      this.document.body.style.overflow = this.originalBodyOverflow ?? ''
      this.originalBodyOverflow = null
    }

    const returnFocus = layer.returnFocus?.isConnected
      ? layer.returnFocus
      : layer.fallbackReturnFocus()
    if (
      wasTopLayer &&
      layer.restoreFocus &&
      returnFocus?.isConnected &&
      !returnFocus.closest('[inert]')
    ) {
      focusElement(returnFocus)
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    const layer = this.layers.at(-1)
    if (!layer) return

    if (event.key === 'Escape') {
      layer.onEscapeKeyDown(event)
      return
    }

    if (event.key !== 'Tab') return

    const tabbableElements = getTabbableElements(layer.content)
    const activeElement = this.document.activeElement
    const firstElement = tabbableElements[0]
    const lastElement = tabbableElements.at(-1)

    if (!firstElement || !lastElement) {
      event.preventDefault()
      focusElement(layer.content)
      return
    }

    if (!activeElement || !layer.content.contains(activeElement)) {
      event.preventDefault()
      focusElement(event.shiftKey ? lastElement : firstElement)
      return
    }

    if (event.shiftKey && (activeElement === firstElement || activeElement === layer.content)) {
      event.preventDefault()
      focusElement(lastElement)
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      focusElement(firstElement)
    }
  }

  private readonly handleFocusIn = (event: FocusEvent) => {
    const layer = this.layers.at(-1)
    const NodeConstructor = layer?.content.ownerDocument.defaultView?.Node
    if (
      !layer ||
      (NodeConstructor && event.target instanceof NodeConstructor && layer.content.contains(event.target))
    ) {
      return
    }

    focusInitialElement(layer)
  }

  private restoreOutsideElements() {
    for (const [element, state] of this.hiddenElements) {
      element.inert = state.inert
      if (state.ariaHidden === null) {
        element.removeAttribute('aria-hidden')
      } else {
        element.setAttribute('aria-hidden', state.ariaHidden)
      }
    }
    this.hiddenElements.clear()
  }

  private updateOutsideElements() {
    this.restoreOutsideElements()

    let branch: HTMLElement | null = this.layers.at(-1)?.content ?? null
    while (branch && branch !== this.document.body) {
      const parent = branch.parentElement
      if (!parent) break
      const HTMLElementConstructor = this.document.defaultView?.HTMLElement

      for (const sibling of parent.children) {
        if (
          !HTMLElementConstructor ||
          sibling === branch ||
          !(sibling instanceof HTMLElementConstructor)
        ) {
          continue
        }

        this.hiddenElements.set(sibling, {
          ariaHidden: sibling.getAttribute('aria-hidden'),
          inert: sibling.inert,
        })
        sibling.inert = true
        sibling.setAttribute('aria-hidden', 'true')
      }

      branch = parent
    }
  }
}

const managers = new WeakMap<Document, DialogManager>()

type RegisterDialogLayerOptions = Omit<DialogLayer, 'fallbackReturnFocus' | 'returnFocus'> & {
  fallbackReturnFocus?: () => HTMLElement | null
  returnFocus?: HTMLElement | null
}

export function registerDialogLayer({
  fallbackReturnFocus = () => null,
  returnFocus = null,
  ...options
}: RegisterDialogLayerOptions) {
  const document = options.content.ownerDocument
  let manager = managers.get(document)

  if (!manager) {
    manager = new DialogManager(document)
    managers.set(document, manager)
  }

  return manager.add({ ...options, fallbackReturnFocus, returnFocus })
}
