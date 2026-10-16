const TABBABLE_SELECTOR = [
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

function isVisible(element: HTMLElement) {
  const ownerWindow = element.ownerDocument.defaultView
  if (
    !ownerWindow ||
    element.matches(':disabled') ||
    element.closest('[inert], [aria-hidden="true"]')
  ) {
    return false
  }

  const style = ownerWindow.getComputedStyle(element)
  return style.visibility !== 'hidden' && style.display !== 'none' && element.getClientRects().length > 0
}

export function getTabbableElements(container: HTMLElement) {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR))
    .filter((element) => element.tabIndex >= 0 && isVisible(element))

  const tabbable = candidates.filter((element) => {
    if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) {
      return true
    }

    const group = candidates.filter(
      (candidate): candidate is HTMLInputElement =>
        candidate instanceof HTMLInputElement &&
        candidate.type === 'radio' &&
        candidate.name === element.name &&
        candidate.form === element.form,
    )
    return (group.find((radio) => radio.checked) ?? group[0]) === element
  })

  return tabbable
    .map((element, domOrder) => ({ element, domOrder }))
    .sort((left, right) => {
      const leftTabIndex = left.element.tabIndex
      const rightTabIndex = right.element.tabIndex
      if (leftTabIndex === rightTabIndex) return left.domOrder - right.domOrder
      if (leftTabIndex === 0) return 1
      if (rightTabIndex === 0) return -1
      return leftTabIndex - rightTabIndex
    })
    .map(({ element }) => element)
}

export function focusInitialElement(container: HTMLElement, preferred?: HTMLElement | null) {
  const autoFocusElement = container.querySelector<HTMLElement>('[autofocus]')
  const candidate =
    (preferred && container.contains(preferred) && isVisible(preferred) ? preferred : null) ??
    (autoFocusElement && isVisible(autoFocusElement) ? autoFocusElement : null) ??
    getTabbableElements(container)[0] ??
    container

  candidate.focus({ preventScroll: true })
}

export function containTabFocus(event: KeyboardEvent, container: HTMLElement) {
  const tabbable = getTabbableElements(container)
  if (tabbable.length === 0) {
    event.preventDefault()
    container.focus({ preventScroll: true })
    return
  }

  const activeElement = container.ownerDocument.activeElement
  const first = tabbable[0]
  const last = tabbable[tabbable.length - 1]

  if (event.shiftKey && (activeElement === first || !container.contains(activeElement))) {
    event.preventDefault()
    last.focus({ preventScroll: true })
  } else if (!event.shiftKey && (activeElement === last || !container.contains(activeElement))) {
    event.preventDefault()
    first.focus({ preventScroll: true })
  }
}
