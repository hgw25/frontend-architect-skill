import type { RefObject } from 'react'

type DialogLayer = {
  element: HTMLElement
}

type SavedIsolation = {
  ariaHidden: string | null
  inert: boolean
}

const layers: DialogLayer[] = []
const isolatedElements = new Map<HTMLElement, SavedIsolation>()

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  return (
    element.tabIndex >= 0 &&
    element.getClientRects().length > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden'
  )
}

export function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.closest('[inert]') && isVisible(element),
  )
}

function restoreIsolation() {
  for (const [element, saved] of isolatedElements) {
    element.inert = saved.inert

    if (saved.ariaHidden === null) {
      element.removeAttribute('aria-hidden')
    } else {
      element.setAttribute('aria-hidden', saved.ariaHidden)
    }
  }
  isolatedElements.clear()
}

function isolate(element: HTMLElement) {
  if (isolatedElements.has(element)) return

  isolatedElements.set(element, {
    ariaHidden: element.getAttribute('aria-hidden'),
    inert: element.inert,
  })
  element.inert = true
  element.setAttribute('aria-hidden', 'true')
}

function syncIsolation() {
  restoreIsolation()

  const topLayer = layers.at(-1)?.element
  if (!topLayer?.isConnected) return

  let current: HTMLElement | null = topLayer
  while (current && current !== document.body) {
    const parentElement: HTMLElement | null = current.parentElement
    if (!parentElement) break

    for (const sibling of parentElement.children) {
      if (sibling !== current && sibling instanceof HTMLElement) isolate(sibling)
    }

    current = parentElement
  }
}

export function registerDialogLayer(element: HTMLElement) {
  const layer = { element }
  layers.push(layer)

  return {
    activate() {
      syncIsolation()
    },
    unregister() {
      const index = layers.indexOf(layer)
      if (index !== -1) layers.splice(index, 1)
      syncIsolation()
    },
  }
}

export function isTopDialogLayer(element: HTMLElement | null) {
  return Boolean(element && layers.at(-1)?.element === element)
}

type FocusScopeOptions = {
  contentRef: RefObject<HTMLElement | null>
  initialFocusRef?: RefObject<HTMLElement | null>
  onDismiss: () => void
  onEscapeKeyDown?: (event: KeyboardEvent) => void
}

export function mountFocusScope({
  contentRef,
  initialFocusRef,
  onDismiss,
  onEscapeKeyDown,
}: FocusScopeOptions) {
  const currentContent = contentRef.current
  if (!currentContent) return () => undefined
  const content: HTMLElement = currentContent

  const restoreTarget =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  const layer = registerDialogLayer(content)
  const requestedInitialFocus = initialFocusRef?.current
  const initialFocus =
    (requestedInitialFocus && content.contains(requestedInitialFocus)
      ? requestedInitialFocus
      : undefined) ??
    getFocusableElements(content)[0] ??
    content
  initialFocus.focus({ preventScroll: true })
  const focusedElement =
    document.activeElement instanceof HTMLElement && content.contains(document.activeElement)
      ? document.activeElement
      : (getFocusableElements(content)[0] ?? content)
  if (focusedElement !== document.activeElement) focusedElement.focus({ preventScroll: true })
  let lastFocusedInside: HTMLElement = focusedElement

  layer.activate()

  function handleFocusIn(event: FocusEvent) {
    if (!isTopDialogLayer(content)) return

    const target = event.target
    if (target instanceof HTMLElement && content.contains(target)) {
      lastFocusedInside = target
      return
    }

    const fallback =
      (lastFocusedInside.isConnected && lastFocusedInside) ||
      getFocusableElements(content)[0] ||
      content
    fallback.focus({ preventScroll: true })
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!isTopDialogLayer(content)) return

    if (event.key === 'Escape') {
      onEscapeKeyDown?.(event)
      if (event.defaultPrevented) return

      event.preventDefault()
      event.stopPropagation()
      onDismiss()
      return
    }

    if (event.key !== 'Tab' || event.defaultPrevented) return

    const focusableElements = getFocusableElements(content)
    if (focusableElements.length === 0) {
      event.preventDefault()
      content.focus({ preventScroll: true })
      return
    }

    const first = focusableElements[0]
    const last = focusableElements.at(-1)!
    const activeElement = document.activeElement

    if (!content.contains(activeElement)) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus({ preventScroll: true })
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault()
      last.focus({ preventScroll: true })
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault()
      first.focus({ preventScroll: true })
    }
  }

  document.addEventListener('focusin', handleFocusIn)
  document.addEventListener('keydown', handleKeyDown, true)

  return () => {
    document.removeEventListener('focusin', handleFocusIn)
    document.removeEventListener('keydown', handleKeyDown, true)
    layer.unregister()

    queueMicrotask(() => {
      const activeLayer = layers.at(-1)?.element
      if (
        restoreTarget?.isConnected &&
        (!activeLayer || activeLayer.contains(restoreTarget))
      ) {
        restoreTarget.focus({ preventScroll: true })
      }
    })
  }
}
