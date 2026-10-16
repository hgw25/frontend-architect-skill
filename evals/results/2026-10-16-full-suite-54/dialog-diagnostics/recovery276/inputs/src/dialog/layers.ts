type DialogLayer = {
  id: symbol
  content: HTMLElement
  portalHost: HTMLElement | null
}

type HiddenElementState = {
  ariaHidden: string | null
  inert: boolean
}

const layers: DialogLayer[] = []
const hiddenElements = new Map<HTMLElement, HiddenElementState>()
let scrollLock: { document: Document; overflow: string } | null = null

function restoreIsolation() {
  for (const [element, state] of hiddenElements) {
    element.inert = state.inert
    if (state.ariaHidden === null) element.removeAttribute('aria-hidden')
    else element.setAttribute('aria-hidden', state.ariaHidden)
  }
  hiddenElements.clear()
}

function hide(element: HTMLElement) {
  if (hiddenElements.has(element)) return
  hiddenElements.set(element, {
    ariaHidden: element.getAttribute('aria-hidden'),
    inert: element.inert,
  })
  element.inert = true
  element.setAttribute('aria-hidden', 'true')
}

function isolateTopLayer() {
  restoreIsolation()
  const topLayer = layers.at(-1)
  if (!topLayer) return

  const body = topLayer.content.ownerDocument.body
  let activeBranch: HTMLElement | null = topLayer.portalHost ?? topLayer.content

  while (activeBranch && activeBranch !== body) {
    const parentElement: HTMLElement | null = activeBranch.parentElement
    if (!parentElement) break

    for (const sibling of parentElement.children) {
      if (sibling !== activeBranch && sibling instanceof HTMLElement) hide(sibling)
    }
    activeBranch = parentElement
  }
}

function lockDocumentScroll(document: Document) {
  if (scrollLock) return
  scrollLock = { document, overflow: document.body.style.overflow }
  document.body.style.overflow = 'hidden'
}

function unlockDocumentScroll() {
  if (!scrollLock) return
  scrollLock.document.body.style.overflow = scrollLock.overflow
  scrollLock = null
}

export function registerDialogLayer(layer: DialogLayer) {
  layers.push(layer)
  lockDocumentScroll(layer.content.ownerDocument)
  isolateTopLayer()

  return () => {
    const index = layers.findIndex(({ id }) => id === layer.id)
    if (index !== -1) layers.splice(index, 1)
    isolateTopLayer()
    if (layers.length === 0) unlockDocumentScroll()
  }
}

export function isTopDialogLayer(id: symbol) {
  return layers.at(-1)?.id === id
}
