import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const order = cards.map((card) => card.id);
const cardNodes = new Map();
const animations = new Map();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let boardVisible = true;
let drag = null;
let pendingSave = null;
let failedSave = null;
let saving = false;

const toggleButton = document.createElement('button');
toggleButton.id = 'toggle';

const status = document.createElement('p');
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');

const saveError = document.createElement('div');
saveError.setAttribute('role', 'alert');
saveError.hidden = true;

const errorMessage = document.createElement('span');
errorMessage.textContent = 'Save failed. Your latest order is still available to retry. ';

const retryButton = document.createElement('button');
retryButton.type = 'button';
retryButton.textContent = 'Retry save';

saveError.append(errorMessage, retryButton);

const list = document.createElement('ol');
list.setAttribute('aria-label', 'Board');

function createCard(card) {
  const item = document.createElement('li');
  item.dataset.cardId = card.id;

  const title = document.createElement('h2');
  title.textContent = card.title;

  const body = document.createElement('p');
  body.textContent = card.body;

  const moveUp = document.createElement('button');
  moveUp.type = 'button';
  moveUp.textContent = 'Move up';
  moveUp.addEventListener('click', () => moveBy(card.id, -1));

  const moveDown = document.createElement('button');
  moveDown.type = 'button';
  moveDown.textContent = 'Move down';
  moveDown.addEventListener('click', () => moveBy(card.id, 1));

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'move-handle';
  handle.textContent = `Move card ${card.id}`;
  handle.addEventListener('pointerdown', (event) => startDrag(event, card.id));
  handle.addEventListener('pointerup', finishDrag);
  handle.addEventListener('pointercancel', cancelDrag);

  item.append(title, body, moveUp, moveDown, handle);
  cardNodes.set(card.id, item);
  return item;
}

function measureCards() {
  return new Map(order.map((id) => [id, cardNodes.get(id).getBoundingClientRect()]));
}

function settleAnimations() {
  for (const animation of animations.values()) animation.cancel();
  animations.clear();
}

function animateFrom(firstRects) {
  if (reduceMotion.matches || !boardVisible) return;

  const lastRects = measureCards();
  for (const id of order) {
    const first = firstRects.get(id);
    const last = lastRects.get(id);
    const deltaX = first.x - last.x;
    const deltaY = first.y - last.y;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;

    const node = cardNodes.get(id);
    const animation = node.animate(
      [
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
    animations.set(id, animation);
    animation.addEventListener('finish', () => {
      if (animations.get(id) === animation) animations.delete(id);
    });
    animation.addEventListener('cancel', () => {
      if (animations.get(id) === animation) animations.delete(id);
    });
  }
}

function reorderCard(id, destinationIndex) {
  const sourceIndex = order.indexOf(id);
  if (sourceIndex < 0 || destinationIndex < 0 || destinationIndex >= order.length) return;
  if (sourceIndex === destinationIndex) return;

  // Read the current visual positions before replacing an interrupted transition.
  const firstRects = measureCards();
  settleAnimations();

  order.splice(sourceIndex, 1);
  order.splice(destinationIndex, 0, id);

  const node = cardNodes.get(id);
  const nextId = order[destinationIndex + 1];
  const focusedControl = node.contains(document.activeElement) ? document.activeElement : null;
  list.insertBefore(node, nextId ? cardNodes.get(nextId) : null);
  focusedControl?.focus({ preventScroll: true });

  animateFrom(firstRects);
  requestSave([...order]);
}

function moveBy(id, delta) {
  reorderCard(id, order.indexOf(id) + delta);
}

function startDrag(event, id) {
  if (!event.isPrimary || event.button !== 0) return;
  drag = { id, pointerId: event.pointerId, handle: event.currentTarget };
  event.currentTarget.setPointerCapture(event.pointerId);
  cardNodes.get(id).classList.add('is-dragging');
}

function finishDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;

  const { id } = drag;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-card-id]');
  cancelDrag(event);

  if (!target || target.dataset.cardId === id) return;
  reorderCard(id, order.indexOf(target.dataset.cardId));
}

function clearDrag() {
  if (!drag) return;
  const { id, handle, pointerId } = drag;
  if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  cardNodes.get(id).classList.remove('is-dragging');
  drag = null;
}

function cancelDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  clearDrag();
}

function showSaveError() {
  status.textContent = '';
  saveError.hidden = false;
}

function requestSave(snapshot) {
  pendingSave = snapshot;
  failedSave = null;
  saveError.hidden = true;
  if (!saving) void drainSaves();
}

async function drainSaves() {
  if (saving) return;
  saving = true;

  while (pendingSave) {
    const snapshot = pendingSave;
    pendingSave = null;
    status.textContent = 'Saving';

    try {
      await saveOrder(snapshot);
    } catch {
      failedSave = pendingSave ?? snapshot;
      pendingSave = null;
      saving = false;
      showSaveError();
      return;
    }
  }

  saving = false;
  status.textContent = 'Saved';
}

function retrySave() {
  if (!failedSave || saving) return;
  pendingSave = failedSave;
  failedSave = null;
  saveError.hidden = true;
  void drainSaves();
}

function renderVisibility() {
  toggleButton.textContent = boardVisible ? 'Hide board' : 'Show board';
  if (boardVisible) {
    app.append(list);
  } else {
    clearDrag();
    settleAnimations();
    list.remove();
  }
}

toggleButton.addEventListener('click', () => {
  boardVisible = !boardVisible;
  renderVisibility();
});
retryButton.addEventListener('click', retrySave);
window.addEventListener('resize', settleAnimations);
window.addEventListener('scroll', settleAnimations, { passive: true });
reduceMotion.addEventListener('change', (event) => {
  if (event.matches) settleAnimations();
});

for (const card of cards) list.append(createCard(card));
app.append(toggleButton, status, saveError);
renderVisibility();
