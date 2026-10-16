type IsolationSnapshot = {
  ariaHidden: string | null
  inert: boolean
}

type DialogLayer = {
  id: symbol
  portal: HTMLElement
}

type DialogLayerOptions = {
  content: HTMLElement
  initialFocus?: HTMLElement | null
  onCloseAutoFocus?: (event: Event) => void
  onDismiss: () => void
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  onOpenAutoFocus?: (event: Event) => void
  onPointerDownOutside?: (event: PointerEvent) => void
  portal: HTMLElement
  restoreFocus?: HTMLElement | null
}

const dialogLayers: DialogLayer[] = []
const isolatedElements = new Map<HTMLElement, IsolationSnapshot>()
let isolationObserver: MutationObserver | null = null

function restoreIsolation() {
  for (const [element, snapshot] of isolatedElements) {
    if (snapshot.ariaHidden === null) element.removeAttribute('aria-hidden')
    else element.setAttribute('aria-hidden', snapshot.ariaHidden)
    element.inert = snapshot.inert
  }
  isolatedElements.clear()
}

function isolateElement(element: HTMLElement) {
  if (isolatedElements.has(element)) return

  isolatedElements.set(element, {
    ariaHidden: element.getAttribute('aria-hidden'),
    inert: element.inert,
  })
  element.setAttribute('aria-hidden', 'true')
  element.inert = true
}

function syncIsolation() {
  restoreIsolation()
  const topLayer = dialogLayers.at(-1)
  if (!topLayer?.portal.isConnected) return

  let allowedElement: HTMLElement = topLayer.portal
  let parent = allowedElement.parentElement

  while (parent) {
    for (const sibling of parent.children) {
      if (sibling !== allowedElement && sibling instanceof HTMLElement) {
        isolateElement(sibling)
      }
    }

    if (parent === document.body) break
    allowedElement = parent
    parent = parent.parentElement
  }
}

function registerDialogLayer(layer: DialogLayer) {
  dialogLayers.push(layer)
  syncIsolation()

  if (!isolationObserver) {
    isolationObserver = new MutationObserver(syncIsolation)
    isolationObserver.observe(document.body, { childList: true, subtree: true })
  }

  return () => {
    const index = dialogLayers.findIndex(({ id }) => id === layer.id)
    if (index >= 0) dialogLayers.splice(index, 1)
    syncIsolation()

    if (dialogLayers.length === 0) {
      isolationObserver?.disconnect()
      isolationObserver = null
    }
  }
}

function isTopDialog(id: symbol) {
  return dialogLayers.at(-1)?.id === id
}

const tabbableSelector = [
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

function getTabbableElements(content: HTMLElement) {
  return Array.from(content.querySelectorAll<HTMLElement>(tabbableSelector)).filter(
    (element) => {
      const style = getComputedStyle(element)
      return (
        element.getClientRects().length > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !element.closest('[inert], [aria-hidden="true"]')
      )
    },
  )
}

function focusElement(element: HTMLElement | null | undefined) {
  element?.focus({ preventScroll: true })
}

export function mountDialogLayer({
  content,
  initialFocus,
  onCloseAutoFocus,
  onDismiss,
  onEscapeKeyDown,
  onOpenAutoFocus,
  onPointerDownOutside,
  portal,
  restoreFocus,
}: DialogLayerOptions) {
  const id = Symbol('dialog-layer')
  const unregister = registerDialogLayer({ id, portal })
  const openFocusEvent = new Event('dialog.openAutoFocus', { cancelable: true })
  onOpenAutoFocus?.(openFocusEvent)

  if (!openFocusEvent.defaultPrevented) {
    const autofocusTarget = content.querySelector<HTMLElement>('[autofocus]')
    focusElement(
      initialFocus ??
        autofocusTarget ??
        getTabbableElements(content)[0] ??
        content,
    )
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isTopDialog(id)) return

    if (event.key === 'Escape') {
      onEscapeKeyDown?.(event)
      if (!event.defaultPrevented) {
        event.preventDefault()
        event.stopPropagation()
        onDismiss()
      }
      return
    }

    if (event.key !== 'Tab') return

    const tabbable = getTabbableElements(content)
    if (tabbable.length === 0) {
      event.preventDefault()
      focusElement(content)
      return
    }

    const first = tabbable[0]
    const last = tabbable[tabbable.length - 1]
    const activeElement = content.ownerDocument.activeElement

    if (
      event.shiftKey &&
      (activeElement === first || !content.contains(activeElement))
    ) {
      event.preventDefault()
      focusElement(last)
    } else if (
      !event.shiftKey &&
      (activeElement === last || !content.contains(activeElement))
    ) {
      event.preventDefault()
      focusElement(first)
    }
  }

  const handleFocusIn = (event: FocusEvent) => {
    if (!isTopDialog(id) || content.contains(event.target as Node)) return
    focusElement(getTabbableElements(content)[0] ?? content)
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (!isTopDialog(id) || content.contains(event.target as Node)) return
    onPointerDownOutside?.(event)
    if (!event.defaultPrevented) onDismiss()
  }

  const ownerDocument = content.ownerDocument
  ownerDocument.addEventListener('keydown', handleKeyDown)
  ownerDocument.addEventListener('focusin', handleFocusIn)
  ownerDocument.addEventListener('pointerdown', handlePointerDown)

  return () => {
    ownerDocument.removeEventListener('keydown', handleKeyDown)
    ownerDocument.removeEventListener('focusin', handleFocusIn)
    ownerDocument.removeEventListener('pointerdown', handlePointerDown)
    unregister()

    const closeFocusEvent = new Event('dialog.closeAutoFocus', {
      cancelable: true,
    })
    onCloseAutoFocus?.(closeFocusEvent)
    if (!closeFocusEvent.defaultPrevented && restoreFocus?.isConnected) {
      focusElement(restoreFocus)
    }
  }
}
