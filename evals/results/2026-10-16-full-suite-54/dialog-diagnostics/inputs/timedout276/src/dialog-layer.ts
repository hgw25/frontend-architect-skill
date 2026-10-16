const FOCUSABLE_SELECTOR = [
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

export type DialogLayer = {
  content: HTMLElement
  dismiss: () => void
  initialFocus: () => HTMLElement | null
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  restoreFocus: HTMLElement | null
}

type ElementSnapshot = {
  ariaHidden: string | null
  inert: boolean
}

const layers: DialogLayer[] = []
const elementSnapshots = new Map<HTMLElement, ElementSnapshot>()
let previousBodyOverflow = ''

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  return style.visibility !== 'hidden' && style.display !== 'none' && element.getClientRects().length > 0
}

function getTabbableElements(content: HTMLElement) {
  const elements = Array.from(content.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.closest('[inert]') && isVisible(element),
  )

  return elements.sort((left, right) => {
    const leftPriority = left.tabIndex > 0 ? left.tabIndex : Number.MAX_SAFE_INTEGER
    const rightPriority = right.tabIndex > 0 ? right.tabIndex : Number.MAX_SAFE_INTEGER
    return leftPriority - rightPriority
  })
}

function focus(element: HTMLElement | null) {
  if (!element) return false
  element.focus({ preventScroll: true })
  return document.activeElement === element
}

function focusFirst(layer: DialogLayer) {
  const requested = layer.initialFocus()
  if (requested && layer.content.contains(requested) && focus(requested)) return

  focus(getTabbableElements(layer.content)[0] ?? layer.content)
}

function getTopLayer() {
  return layers.at(-1)
}

function handleKeyDown(event: KeyboardEvent) {
  const layer = getTopLayer()
  if (!layer) return

  if (event.key === 'Escape') {
    layer.onEscapeKeyDown?.(event)
    if (!event.defaultPrevented) {
      event.preventDefault()
      layer.dismiss()
    }
    event.stopPropagation()
    return
  }

  if (event.key !== 'Tab') return

  const tabbable = getTabbableElements(layer.content)
  if (tabbable.length === 0) {
    event.preventDefault()
    focus(layer.content)
    return
  }

  const activeElement = document.activeElement
  const first = tabbable[0]
  const last = tabbable[tabbable.length - 1]

  if (event.shiftKey && (activeElement === first || !layer.content.contains(activeElement))) {
    event.preventDefault()
    focus(last)
  } else if (!event.shiftKey && (activeElement === last || !layer.content.contains(activeElement))) {
    event.preventDefault()
    focus(first)
  }
}

function handleFocusIn(event: FocusEvent) {
  const layer = getTopLayer()
  if (!layer || layer.content.contains(event.target as Node)) return
  focusFirst(layer)
}

function restoreElement(element: HTMLElement, snapshot: ElementSnapshot) {
  element.inert = snapshot.inert
  if (snapshot.ariaHidden === null) element.removeAttribute('aria-hidden')
  else element.setAttribute('aria-hidden', snapshot.ariaHidden)
}

function syncBackgroundIsolation() {
  const layer = getTopLayer()
  if (!layer) {
    for (const [element, snapshot] of elementSnapshots) restoreElement(element, snapshot)
    elementSnapshots.clear()
    document.body.style.overflow = previousBodyOverflow
    return
  }

  for (const [element, snapshot] of elementSnapshots) restoreElement(element, snapshot)

  let activeBranch = layer.content.closest<HTMLElement>('[data-dialog-portal]') ?? layer.content
  while (activeBranch.parentElement) {
    const parent = activeBranch.parentElement
    for (const sibling of Array.from(parent.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === activeBranch) continue
      if (!elementSnapshots.has(sibling)) {
        elementSnapshots.set(sibling, {
          ariaHidden: sibling.getAttribute('aria-hidden'),
          inert: sibling.inert,
        })
      }
      sibling.inert = true
      sibling.setAttribute('aria-hidden', 'true')
    }
    if (parent === document.body) break
    activeBranch = parent
  }
}

export function registerDialogLayer(layer: DialogLayer) {
  if (layers.length === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('focusin', handleFocusIn, true)
  }

  layers.push(layer)
  syncBackgroundIsolation()
  queueMicrotask(() => {
    if (getTopLayer() === layer) focusFirst(layer)
  })

  return () => {
    const wasTopLayer = getTopLayer() === layer
    const index = layers.indexOf(layer)
    if (index !== -1) layers.splice(index, 1)

    syncBackgroundIsolation()
    if (layers.length === 0) {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('focusin', handleFocusIn, true)
    }

    if (wasTopLayer) {
      queueMicrotask(() => {
        if (layer.restoreFocus?.isConnected) focus(layer.restoreFocus)
        else {
          const parentLayer = getTopLayer()
          if (parentLayer && !parentLayer.content.contains(document.activeElement)) focusFirst(parentLayer)
        }
      })
    }
  }
}

export function isTopDialogLayer(content: HTMLElement | null) {
  return content !== null && getTopLayer()?.content === content
}
