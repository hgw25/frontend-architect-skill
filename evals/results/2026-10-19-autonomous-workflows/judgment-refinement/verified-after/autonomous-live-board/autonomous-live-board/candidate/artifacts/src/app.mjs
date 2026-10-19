import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const cardsById = new Map(cards.map(card => [card.id, card]));
const cardNodes = new Map();
const activeAnimations = new Map();
let order = cards.map(card => card.id);
let visible = true;
let list = null;
let queuedSave = null;
let activeSave = null;
let failedSave = null;
let draggedCardId = null;
let dragPointerId = null;

app.replaceChildren();
const toggle = document.createElement('button');
const status = document.createElement('p');
const feedback = document.createElement('div');
status.setAttribute('role', 'status');
app.append(toggle, status, feedback);

function setStatus(message) {
  status.textContent = message;
}

function showSaveError() {
  feedback.replaceChildren();
  const alert = document.createElement('p');
  alert.setAttribute('role', 'alert');
  alert.textContent = 'Unable to save the card order.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Retry save';
  retry.addEventListener('click', retrySave);
  feedback.append(alert, retry);
}

function clearSaveError() {
  feedback.replaceChildren();
}

function cancelAnimations() {
  for (const animation of activeAnimations.values()) animation.cancel();
  activeAnimations.clear();
}

function createCardNode(id) {
  const card = cardsById.get(id);
  const item = document.createElement('li');
  item.dataset.cardId = id;

  const title = document.createElement('h2');
  title.textContent = card.title;
  const body = document.createElement('p');
  body.textContent = card.body;
  const up = document.createElement('button');
  up.type = 'button';
  up.textContent = 'Move up';
  up.addEventListener('click', () => moveCard(id, order.indexOf(id) - 1));
  const down = document.createElement('button');
  down.type = 'button';
  down.textContent = 'Move down';
  down.addEventListener('click', () => moveCard(id, order.indexOf(id) + 1));
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.textContent = `Move card ${id}`;
  handle.setAttribute('aria-label', `Move card ${id}`);
  handle.addEventListener('pointerdown', event => startDrag(event, id, handle));
  handle.addEventListener('pointerup', finishDrag);
  handle.addEventListener('pointercancel', cancelDrag);

  item.append(title, body, up, down, handle);
  cardNodes.set(id, item);
  return item;
}

function renderBoard() {
  if (!visible) return;
  if (!list) {
    list = document.createElement('ol');
    list.setAttribute('aria-label', 'Board');
    app.append(list);
  }

  const focusTarget = list.contains(document.activeElement) ? document.activeElement : null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const firstRects = new Map();
  if (!reduceMotion) {
    for (const [id, item] of cardNodes) {
      if (item.isConnected) firstRects.set(id, item.getBoundingClientRect());
    }
  }
  cancelAnimations();

  for (const id of order) list.append(cardNodes.get(id) ?? createCardNode(id));
  if (focusTarget && document.activeElement !== focusTarget) focusTarget.focus({ preventScroll: true });

  if (reduceMotion) return;
  for (const id of order) {
    const first = firstRects.get(id);
    const item = cardNodes.get(id);
    if (!first) continue;
    const last = item.getBoundingClientRect();
    const x = first.left - last.left;
    const y = first.top - last.top;
    if (x === 0 && y === 0) continue;
    const animation = item.animate(
      [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }],
      { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
    activeAnimations.set(id, animation);
    animation.onfinish = () => {
      if (activeAnimations.get(id) === animation) activeAnimations.delete(id);
    };
  }
}

function moveCard(id, targetIndex) {
  const currentIndex = order.indexOf(id);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length || currentIndex === targetIndex) return;
  const nextOrder = [...order];
  nextOrder.splice(currentIndex, 1);
  nextOrder.splice(targetIndex, 0, id);
  order = nextOrder;
  renderBoard();
  requestSave(order);
}

function requestSave(snapshot) {
  queuedSave = [...snapshot];
  failedSave = null;
  clearSaveError();
  if (activeSave) {
    setStatus('Saving…');
    return;
  }
  startNextSave();
}

function startNextSave() {
  if (activeSave || !queuedSave) return;
  activeSave = queuedSave;
  queuedSave = null;
  setStatus('Saving…');
  saveOrder(activeSave).then(() => {
    activeSave = null;
    if (queuedSave) {
      startNextSave();
      return;
    }
    setStatus('Saved');
  }).catch(() => {
    const failedSnapshot = queuedSave ?? activeSave;
    activeSave = null;
    queuedSave = null;
    failedSave = failedSnapshot;
    setStatus('Save failed');
    showSaveError();
  });
}

function retrySave() {
  if (!failedSave) return;
  queuedSave = failedSave;
  failedSave = null;
  clearSaveError();
  startNextSave();
}

function startDrag(event, id, handle) {
  if (event.button !== 0) return;
  draggedCardId = id;
  dragPointerId = event.pointerId;
  handle.setPointerCapture(event.pointerId);
}

function finishDrag(event) {
  if (event.pointerId !== dragPointerId || !draggedCardId) return;
  const sourceId = draggedCardId;
  cancelDrag(event);
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-card-id]');
  if (!target) return;
  moveCard(sourceId, order.indexOf(target.dataset.cardId));
}

function cancelDrag(event) {
  if (event.pointerId !== dragPointerId) return;
  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  draggedCardId = null;
  dragPointerId = null;
}

function updateVisibility() {
  toggle.textContent = visible ? 'Hide board' : 'Show board';
  if (visible) {
    renderBoard();
    return;
  }
  cancelAnimations();
  list?.remove();
  list = null;
}

toggle.addEventListener('click', () => {
  visible = !visible;
  updateVisibility();
});

updateVisibility();
