import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const cardViews = new Map();
const activeAnimations = new Map();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let order = cards.map((card) => card.id);
let list = null;
let boardVisible = true;
let drag = null;

let changeRevision = 0;
let savedRevision = 0;
let saving = false;
let saveBlocked = false;

const toggleButton = document.createElement('button');
toggleButton.type = 'button';

const saveStatus = document.createElement('p');
saveStatus.setAttribute('role', 'status');
saveStatus.setAttribute('aria-live', 'polite');

const saveError = document.createElement('div');
saveError.setAttribute('role', 'alert');
saveError.hidden = true;

const saveErrorMessage = document.createElement('span');
const retryButton = document.createElement('button');
retryButton.type = 'button';
retryButton.textContent = 'Retry save';
retryButton.addEventListener('click', retrySave);
saveError.append(saveErrorMessage, retryButton);

app.append(toggleButton, saveStatus, saveError);
toggleButton.addEventListener('click', toggleBoard);

for (const card of cards) {
  cardViews.set(card.id, createCardView(card));
}

showBoard();

window.addEventListener('resize', cancelAnimations);
window.addEventListener('scroll', cancelAnimations, { passive: true });
reduceMotion.addEventListener('change', ({ matches }) => {
  if (matches) cancelAnimations();
});

function createCardView(card) {
  const element = document.createElement('li');
  element.dataset.cardId = card.id;

  const title = document.createElement('h2');
  title.textContent = card.title;

  const body = document.createElement('p');
  body.textContent = card.body;

  const moveUp = createButton('Move up', () => {
    moveCard(card.id, order.indexOf(card.id) - 1);
  });
  const moveDown = createButton('Move down', () => {
    moveCard(card.id, order.indexOf(card.id) + 1);
  });
  const dragHandle = createButton(`Move card ${card.id}`);
  dragHandle.className = 'drag-handle';
  dragHandle.addEventListener('pointerdown', (event) => beginDrag(event, card.id, dragHandle));
  dragHandle.addEventListener('pointermove', updateDragTarget);
  dragHandle.addEventListener('pointerup', finishDrag);
  dragHandle.addEventListener('pointercancel', cancelDrag);
  dragHandle.addEventListener('lostpointercapture', cancelDrag);

  element.append(title, body, moveUp, moveDown, dragHandle);
  return { element, moveUp, moveDown, dragHandle };
}

function createButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (onClick) button.addEventListener('click', onClick);
  return button;
}

function toggleBoard() {
  if (boardVisible) {
    hideBoard();
  } else {
    showBoard();
  }
}

function showBoard() {
  boardVisible = true;
  toggleButton.textContent = 'Hide board';
  list = document.createElement('ol');
  list.setAttribute('aria-label', 'Board');
  app.append(list);
  syncListOrder();
  updateMoveButtons();
}

function hideBoard() {
  boardVisible = false;
  toggleButton.textContent = 'Show board';
  cancelDrag();
  cancelAnimations();
  list.remove();
  list = null;
}

function moveCard(cardId, destinationIndex) {
  const sourceIndex = order.indexOf(cardId);
  if (sourceIndex < 0) return;

  const boundedDestination = Math.max(0, Math.min(destinationIndex, order.length - 1));
  if (sourceIndex === boundedDestination) return;

  const firstRects = reduceMotion.matches ? null : measureCardRects();

  order.splice(sourceIndex, 1);
  order.splice(boundedDestination, 0, cardId);
  syncListOrder();
  updateMoveButtons();

  if (firstRects) runFlip(firstRects);
  requestSave();
}

function syncListOrder() {
  if (!list) return;

  order.forEach((id, index) => {
    const expected = cardViews.get(id).element;
    const current = list.children[index];
    if (current !== expected) list.insertBefore(expected, current ?? null);
  });
}

function updateMoveButtons() {
  order.forEach((id, index) => {
    const view = cardViews.get(id);
    view.moveUp.disabled = index === 0;
    view.moveDown.disabled = index === order.length - 1;
  });
}

function measureCardRects() {
  if (!list) return new Map();
  return new Map(order.map((id) => [id, cardViews.get(id).element.getBoundingClientRect()]));
}

function runFlip(firstRects) {
  cancelAnimations();
  const lastRects = measureCardRects();

  for (const id of order) {
    const first = firstRects.get(id);
    const last = lastRects.get(id);
    if (!first || !last) continue;

    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;

    const element = cardViews.get(id).element;
    const animation = element.animate(
      [
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 480, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );

    activeAnimations.set(element, animation);
    animation.addEventListener('finish', () => forgetAnimation(element, animation));
    animation.addEventListener('cancel', () => forgetAnimation(element, animation));
  }
}

function forgetAnimation(element, animation) {
  if (activeAnimations.get(element) === animation) activeAnimations.delete(element);
}

function cancelAnimations() {
  const animations = [...activeAnimations.values()];
  activeAnimations.clear();
  for (const animation of animations) animation.cancel();
}

function beginDrag(event, cardId, handle) {
  if (event.button !== 0 || !list) return;
  event.preventDefault();
  cancelDrag();
  drag = { pointerId: event.pointerId, cardId, handle, target: null };
  handle.setPointerCapture(event.pointerId);
  cardViews.get(cardId).element.classList.add('is-dragging');
}

function updateDragTarget(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const target = cardAtPoint(event.clientX, event.clientY);
  if (target === drag.target) return;
  drag.target?.classList.remove('is-drop-target');
  drag.target = target;
  if (target?.dataset.cardId !== drag.cardId) target?.classList.add('is-drop-target');
}

function finishDrag(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const cardId = drag.cardId;
  const target = cardAtPoint(event.clientX, event.clientY) ?? drag.target;
  const targetId = target?.dataset.cardId;
  const destinationIndex = targetId ? order.indexOf(targetId) : -1;
  clearDragState();
  if (targetId && targetId !== cardId && destinationIndex >= 0) {
    moveCard(cardId, destinationIndex);
  }
}

function cancelDrag(event) {
  if (event && drag && event.pointerId !== drag.pointerId) return;
  clearDragState();
}

function clearDragState() {
  if (!drag) return;
  drag.target?.classList.remove('is-drop-target');
  cardViews.get(drag.cardId).element.classList.remove('is-dragging');
  if (drag.handle.hasPointerCapture(drag.pointerId)) {
    drag.handle.releasePointerCapture(drag.pointerId);
  }
  drag = null;
}

function cardAtPoint(x, y) {
  const card = document.elementFromPoint(x, y)?.closest('[data-card-id]');
  return card && list?.contains(card) ? card : null;
}

function requestSave() {
  changeRevision += 1;
  if (saveBlocked) {
    saveBlocked = false;
    saveError.hidden = true;
  }
  void flushSave();
}

async function flushSave() {
  if (saving || saveBlocked || savedRevision === changeRevision) return;

  saving = true;
  const revision = changeRevision;
  const snapshot = [...order];
  saveStatus.textContent = 'Saving…';

  try {
    await saveOrder(snapshot);
    savedRevision = Math.max(savedRevision, revision);
    if (savedRevision === changeRevision) saveStatus.textContent = 'Saved';
  } catch (error) {
    saveBlocked = true;
    saveStatus.textContent = '';
    saveErrorMessage.textContent = `${error instanceof Error ? error.message : 'Save failed'}. `;
    saveError.hidden = false;
  } finally {
    saving = false;
    if (!saveBlocked && savedRevision < changeRevision) void flushSave();
  }
}

function retrySave() {
  saveBlocked = false;
  saveError.hidden = true;
  void flushSave();
}
