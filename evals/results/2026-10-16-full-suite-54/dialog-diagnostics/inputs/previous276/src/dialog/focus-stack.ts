import type { RefObject } from 'react'

export type DialogLayer = {
  content: HTMLElement
  initialFocusRef?: RefObject<HTMLElement | null>
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  requestClose: () => void
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

function isFocusable(element: HTMLElement) {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element)
  return (
    !element.matches(':disabled') &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
    style?.visibility !== 'hidden' &&
    element.getClientRects().length > 0
  )
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    isFocusable,
  )
}

function focusElement(element: HTMLElement) {
  element.focus({ preventScroll: true })
}

export function focusDialog(layer: DialogLayer) {
  const requestedTarget = layer.initialFocusRef?.current
  if (requestedTarget?.isConnected && layer.content.contains(requestedTarget)) {
    focusElement(requestedTarget)
    return
  }

  const autofocusTarget = layer.content.querySelector<HTMLElement>('[autofocus]')
  if (autofocusTarget && isFocusable(autofocusTarget)) {
    focusElement(autofocusTarget)
    return
  }

  focusElement(getFocusableElements(layer.content)[0] ?? layer.content)
}

type DocumentStack = {
  layers: DialogLayer[]
  removeListeners: () => void
}

const stacks = new WeakMap<Document, DocumentStack>()

function createDocumentStack(document: Document): DocumentStack {
  const stack: DocumentStack = { layers: [], removeListeners: () => undefined }

  const handleKeyDown = (event: KeyboardEvent) => {
    const layer = stack.layers.at(-1)
    if (!layer) return

    if (event.key === 'Escape' && !event.isComposing) {
      layer.onEscapeKeyDown?.(event)
      if (event.defaultPrevented) return

      event.preventDefault()
      layer.requestClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusableElements = getFocusableElements(layer.content)
    if (focusableElements.length === 0) {
      event.preventDefault()
      focusElement(layer.content)
      return
    }

    const activeElement = document.activeElement
    const currentIndex = focusableElements.indexOf(activeElement as HTMLElement)
    const movingBeforeFirst = event.shiftKey && currentIndex <= 0
    const movingAfterLast = !event.shiftKey && currentIndex === focusableElements.length - 1

    if (!layer.content.contains(activeElement) || movingBeforeFirst || movingAfterLast) {
      event.preventDefault()
      focusElement(
        event.shiftKey ? focusableElements[focusableElements.length - 1] : focusableElements[0],
      )
    }
  }

  const handleFocusIn = (event: FocusEvent) => {
    const layer = stack.layers.at(-1)
    if (!layer || layer.content.contains(event.target as Node)) return
    focusDialog(layer)
  }

  document.addEventListener('keydown', handleKeyDown, true)
  document.addEventListener('focusin', handleFocusIn, true)
  stack.removeListeners = () => {
    document.removeEventListener('keydown', handleKeyDown, true)
    document.removeEventListener('focusin', handleFocusIn, true)
  }

  return stack
}

export function registerDialogLayer(layer: DialogLayer) {
  const document = layer.content.ownerDocument
  let stack = stacks.get(document)
  if (!stack) {
    stack = createDocumentStack(document)
    stacks.set(document, stack)
  }

  stack.layers.push(layer)

  return () => {
    const index = stack.layers.indexOf(layer)
    if (index >= 0) stack.layers.splice(index, 1)

    if (stack.layers.length === 0) {
      stack.removeListeners()
      stacks.delete(document)
    }
  }
}
