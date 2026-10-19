import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const cardById = new Map(cards.map((card) => [card.id, card]));
const cardElements = new Map();
const runningAnimations = new Map();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let order = cards.map((card) => card.id);
let boardVisible = true;
let pendingSave = null;
let saveInFlight = false;
let savePaused = false;
let drag = null;

const toggleButton = document.createElement('button');
const status = document.createElement('p');
const errorRegion = document.createElement('div');
const board = document.createElement('ol');

status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
errorRegion.setAttribute('role', 'alert');
board.setAttribute('aria-label', 'Board');

app.append(toggleButton, status, errorRegion);
createBoard();
setBoardVisible(true);

toggleButton.addEventListener('click', () => setBoardVisible(!boardVisible));
window.addEventListener('resize', cancelAnimations);
reducedMotion.addEventListener('change', (event) => {
  if (event.matches) cancelAnimations();
});

function createBoard() {
  for (const id of order) {
    const card = cardById.get(id);
    const item = document.createElement('li');
    const title = document.createElement('h2');
    const body = document.createElement('p');
    const moveUp = createButton('Move up', () => moveByOffset(id, -1));
    const moveDown = createButton('Move down', () => moveByOffset(id, 1));
    const handle = createButton(`Move card ${id}`);

    item.dataset.cardId = id;
    title.textContent = card.title;
    body.textContent = card.body;
    handle.className = 'drag-handle';
    handle.addEventListener('pointerdown', (event) => beginDrag(event, id, handle));
    item.append(title, body, moveUp, moveDown, handle);
    cardElements.set(id, item);
    board.append(item);
  }
}

function createButton(label, onClick) {
  const button = document.createElement('button');
  button.textContent = label;
  if (onClick) button.addEventListener('click', onClick);
  return button;
}

function setBoardVisible(visible) {
  boardVisible = visible;
  toggleButton.textContent = visible ? 'Hide board' : 'Show board';
  cancelDrag();
  cancelAnimations();

  if (visible) {
    app.append(board);
  } else {
    board.remove();
  }
}

function moveByOffset(id, delta) {
  const sourceIndex = order.indexOf(id);
  const targetIndex = sourceIndex + delta;
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= order.length) return;

  const nextOrder = order.slice();
  [nextOrder[sourceIndex], nextOrder[targetIndex]] = [
    nextOrder[targetIndex],
    nextOrder[sourceIndex],
  ];
  commitOrder(nextOrder);
}

function moveToIndex(id, targetIndex) {
  const sourceIndex = order.indexOf(id);
  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= order.length ||
    sourceIndex === targetIndex
  ) return;

  const nextOrder = order.slice();
  const [movedId] = nextOrder.splice(sourceIndex, 1);
  nextOrder.splice(targetIndex, 0, movedId);
  commitOrder(nextOrder);
}

function commitOrder(nextOrder) {
  const previousPositions = boardVisible ? capturePositions() : null;
  const focusedElement = board.contains(document.activeElement)
    ? document.activeElement
    : null;
  cancelAnimations();
  order = nextOrder;

  const fragment = document.createDocumentFragment();
  for (const id of order) fragment.append(cardElements.get(id));
  board.append(fragment);
  focusedElement?.focus({ preventScroll: true });

  if (previousPositions) animateFrom(previousPositions);
  requestSave(order);
}

function capturePositions() {
  return new Map(
    order.map((id) => [id, cardElements.get(id).getBoundingClientRect()]),
  );
}

function animateFrom(previousPositions) {
  if (reducedMotion.matches) return;

  const finalPositions = new Map(
    order.map((id) => [id, cardElements.get(id).getBoundingClientRect()]),
  );

  for (const id of order) {
    const item = cardElements.get(id);
    const first = previousPositions.get(id);
    const last = finalPositions.get(id);
    const x = first.left - last.left;
    const y = first.top - last.top;
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) continue;

    const animation = item.animate(
      [
        { transform: `translate(${x}px, ${y}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 450, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
    runningAnimations.set(id, animation);
    animation.addEventListener('finish', () => {
      if (runningAnimations.get(id) === animation) runningAnimations.delete(id);
    });
    animation.addEventListener('cancel', () => {
      if (runningAnimations.get(id) === animation) runningAnimations.delete(id);
    });
  }
}

function cancelAnimations() {
  for (const animation of runningAnimations.values()) animation.cancel();
  runningAnimations.clear();
}

function beginDrag(event, id, handle) {
  if (event.button !== 0) return;
  event.preventDefault();
  cancelDrag();
  drag = { id, pointerId: event.pointerId, handle };
  handle.setPointerCapture(event.pointerId);
  handle.closest('li').classList.add('is-dragging');
  handle.addEventListener('pointerup', finishDrag);
  handle.addEventListener('pointercancel', cancelDrag);
}

function finishDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const { id } = drag;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-card-id]');
  cancelDrag();
  if (target && board.contains(target)) moveToIndex(id, order.indexOf(target.dataset.cardId));
}

function cancelDrag() {
  if (!drag) return;
  const { handle, pointerId } = drag;
  handle.closest('li').classList.remove('is-dragging');
  handle.removeEventListener('pointerup', finishDrag);
  handle.removeEventListener('pointercancel', cancelDrag);
  if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  drag = null;
}

function requestSave(ids) {
  pendingSave = ids.slice();
  status.textContent = 'Saving…';
  if (!savePaused) flushSave();
}

async function flushSave() {
  if (saveInFlight || savePaused || !pendingSave) return;

  const submittedOrder = pendingSave;
  pendingSave = null;
  saveInFlight = true;
  status.textContent = 'Saving…';

  try {
    await saveOrder(submittedOrder);
    saveInFlight = false;
    if (pendingSave) {
      flushSave();
    } else {
      status.textContent = 'Saved';
      errorRegion.replaceChildren();
    }
  } catch (error) {
    saveInFlight = false;
    pendingSave ??= submittedOrder;
    savePaused = true;
    showSaveError(error);
  }
}

function showSaveError(error) {
  const message = document.createElement('span');
  const retry = createButton('Retry save', retrySave);
  message.textContent = `${error instanceof Error ? error.message : 'Save failed'}. `;
  status.textContent = 'Save failed';
  errorRegion.replaceChildren(message, retry);
}

function retrySave() {
  savePaused = false;
  errorRegion.replaceChildren();
  flushSave();
}
