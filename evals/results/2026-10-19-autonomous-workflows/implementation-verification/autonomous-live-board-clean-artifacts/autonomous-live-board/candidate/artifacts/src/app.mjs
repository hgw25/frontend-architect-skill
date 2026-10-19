import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const cardById = new Map(cards.map((card) => [card.id, card]));
const cardElements = new Map();
const activeAnimations = new Map();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let order = cards.map((card) => card.id);
let board = null;
let visible = true;
let drag = null;

let desiredRevision = 0;
let acknowledgedRevision = 0;
let desiredSnapshot = order.slice();
let saving = false;
let saveBlocked = false;

const toggle = document.createElement('button');
const status = document.createElement('p');
const saveError = document.createElement('div');
const saveErrorText = document.createElement('span');
const retryButton = document.createElement('button');

toggle.id = 'toggle';
status.setAttribute('role', 'status');
saveError.setAttribute('role', 'alert');
saveError.hidden = true;
retryButton.type = 'button';
retryButton.textContent = 'Retry save';
saveError.append(saveErrorText, retryButton);
app.append(toggle, status, saveError);

function updateToggle() {
  toggle.textContent = visible ? 'Hide board' : 'Show board';
}

function createButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (onClick) button.addEventListener('click', onClick);
  return button;
}

function clearDropTarget() {
  if (drag?.targetId) cardElements.get(drag.targetId)?.classList.remove('drop-target');
}

function finishDrag(event, shouldCommit) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const { id, targetId, handle } = drag;
  clearDropTarget();
  drag = null;
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  if (shouldCommit && targetId && targetId !== id) moveAfter(id, targetId);
}

function createCardElement(card) {
  const item = document.createElement('li');
  const heading = document.createElement('h2');
  const body = document.createElement('p');
  const moveUp = createButton('Move up', () => moveBy(card.id, -1));
  const moveDown = createButton('Move down', () => moveBy(card.id, 1));
  const handle = createButton(`Move card ${card.id}`);

  item.dataset.cardId = card.id;
  heading.textContent = card.title;
  body.textContent = card.body;
  handle.className = 'drag-handle';

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    handle.focus();
    handle.setPointerCapture(event.pointerId);
    drag = { id: card.id, pointerId: event.pointerId, targetId: null, handle };
  });
  handle.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-card-id]');
    const targetId = target?.dataset.cardId;
    if (targetId === drag.targetId) return;
    clearDropTarget();
    drag.targetId = targetId && targetId !== drag.id ? targetId : null;
    if (drag.targetId) cardElements.get(drag.targetId)?.classList.add('drop-target');
  });
  handle.addEventListener('pointerup', (event) => finishDrag(event, true));
  handle.addEventListener('pointercancel', (event) => finishDrag(event, false));

  item.append(heading, body, moveUp, moveDown, handle);
  item.moveUp = moveUp;
  item.moveDown = moveDown;
  return item;
}

for (const card of cards) cardElements.set(card.id, createCardElement(card));

function applyOrder() {
  if (!board) return;
  board.append(...order.map((id) => cardElements.get(id)));
  order.forEach((id, index) => {
    const item = cardElements.get(id);
    item.moveUp.disabled = index === 0;
    item.moveDown.disabled = index === order.length - 1;
  });
}

function mountBoard() {
  if (board) return;
  board = document.createElement('ol');
  board.setAttribute('aria-label', 'Board');
  app.append(board);
  applyOrder();
}

function cancelAnimations() {
  for (const animation of activeAnimations.values()) animation.cancel();
  activeAnimations.clear();
}

function unmountBoard() {
  if (!board) return;
  cancelAnimations();
  clearDropTarget();
  drag = null;
  board.remove();
  board = null;
}

function measureCards() {
  if (!board) return new Map();
  return new Map(order.map((id) => [id, cardElements.get(id).getBoundingClientRect()]));
}

function animateFrom(firstRects) {
  if (!board || reducedMotion.matches) return;
  const lastRects = measureCards();

  for (const id of order) {
    const first = firstRects.get(id);
    const last = lastRects.get(id);
    if (!first || !last) continue;
    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;

    const element = cardElements.get(id);
    const animation = element.animate(
      [
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 500, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
    activeAnimations.set(element, animation);
    const forget = () => {
      if (activeAnimations.get(element) === animation) activeAnimations.delete(element);
    };
    animation.addEventListener('finish', forget, { once: true });
    animation.addEventListener('cancel', forget, { once: true });
  }
}

function commitOrder(nextOrder) {
  const firstRects = measureCards();
  cancelAnimations();
  order = nextOrder;
  applyOrder();
  animateFrom(firstRects);
  requestSave();
}

function moveBy(id, delta) {
  const from = order.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return;
  const nextOrder = order.slice();
  [nextOrder[from], nextOrder[to]] = [nextOrder[to], nextOrder[from]];
  commitOrder(nextOrder);
}

function moveAfter(id, targetId) {
  if (id === targetId || !cardById.has(id) || !cardById.has(targetId)) return;
  const nextOrder = order.filter((cardId) => cardId !== id);
  nextOrder.splice(nextOrder.indexOf(targetId) + 1, 0, id);
  if (nextOrder.every((cardId, index) => cardId === order[index])) return;
  commitOrder(nextOrder);
}

function showSaveError(error) {
  status.textContent = '';
  saveErrorText.textContent = `Save failed: ${error instanceof Error ? error.message : 'unavailable'}. `;
  saveError.hidden = false;
}

async function flushSave() {
  if (saving || saveBlocked || acknowledgedRevision === desiredRevision) return;
  saving = true;
  const submittedRevision = desiredRevision;
  const submittedSnapshot = desiredSnapshot;
  status.textContent = 'Saving';
  saveError.hidden = true;

  try {
    await saveOrder(submittedSnapshot);
    acknowledgedRevision = submittedRevision;
    if (acknowledgedRevision === desiredRevision) status.textContent = 'Saved';
  } catch (error) {
    saveBlocked = true;
    showSaveError(error);
  } finally {
    saving = false;
    if (!saveBlocked && acknowledgedRevision !== desiredRevision) void flushSave();
  }
}

function requestSave() {
  desiredRevision += 1;
  desiredSnapshot = order.slice();
  saveBlocked = false;
  void flushSave();
}

function retrySave() {
  saveBlocked = false;
  void flushSave();
}

toggle.addEventListener('click', () => {
  visible = !visible;
  updateToggle();
  if (visible) mountBoard();
  else unmountBoard();
});
retryButton.addEventListener('click', retrySave);
window.addEventListener('resize', cancelAnimations);
reducedMotion.addEventListener('change', (event) => {
  if (event.matches) cancelAnimations();
});

updateToggle();
mountBoard();
