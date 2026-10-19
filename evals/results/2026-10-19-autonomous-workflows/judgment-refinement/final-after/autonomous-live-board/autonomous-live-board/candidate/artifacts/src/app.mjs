import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
let order = cards.map((card) => card.id);
let boardVisible = true;
let list;
let status;
let alert;
let saveInFlight = false;
let pendingOrder;
let failedOrder;
const animations = new Set();

const toggle = document.createElement('button');
toggle.id = 'toggle';
const messages = document.createElement('div');
status = document.createElement('p');
status.setAttribute('role', 'status');
messages.append(status);
app.append(toggle, messages);

function setMessage(kind, text, retryOrder) {
  status.textContent = kind === 'status' ? text : '';
  alert?.remove();
  alert = undefined;
  if (kind !== 'alert') return;

  alert = document.createElement('div');
  alert.setAttribute('role', 'alert');
  alert.textContent = text;
  const retry = document.createElement('button');
  retry.textContent = 'Retry save';
  retry.addEventListener('click', () => {
    pendingOrder = [...retryOrder];
    failedOrder = undefined;
    setMessage('status', 'Saving…');
    flushSave();
  });
  alert.append(' ', retry);
  messages.append(alert);
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function cancelAnimations() {
  for (const animation of animations) animation.cancel();
  animations.clear();
  list?.querySelectorAll('[data-card-id]').forEach((card) => {
    card.style.transform = '';
  });
}

function playFlip(firstRects) {
  if (prefersReducedMotion()) return;
  const lastRects = new Map(
    [...list.children].map((card) => [card.dataset.cardId, card.getBoundingClientRect()]),
  );
  for (const [id, first] of firstRects) {
    const card = cardByElement(id);
    const last = lastRects.get(id);
    if (!card || !last) continue;
    const x = first.left - last.left;
    const y = first.top - last.top;
    if (!x && !y) continue;
    const animation = card.animate(
      [
        { transform: `translate(${x}px, ${y}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 420, easing: 'cubic-bezier(.2, .75, .25, 1)' },
    );
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }
}

function cardByElement(id) {
  return list?.querySelector(`[data-card-id="${id}"]`);
}

function applyOrder({ animate }) {
  if (!list) return;
  const firstRects = animate
    ? new Map([...list.children].map((card) => [card.dataset.cardId, card.getBoundingClientRect()]))
    : new Map();
  cancelAnimations();
  const fragment = document.createDocumentFragment();
  for (const id of order) fragment.append(cardByElement(id));
  list.append(fragment);
  if (animate) playFlip(firstRects);
}

function requestSave() {
  pendingOrder = [...order];
  failedOrder = undefined;
  setMessage('status', 'Saving…');
  flushSave();
}

function flushSave() {
  if (saveInFlight || !pendingOrder) return;
  const snapshot = pendingOrder;
  pendingOrder = undefined;
  saveInFlight = true;
  saveOrder(snapshot)
    .then(() => {
      if (!pendingOrder) setMessage('status', 'Saved');
    })
    .catch(() => {
      if (!pendingOrder) failedOrder = snapshot;
    })
    .finally(() => {
      saveInFlight = false;
      if (pendingOrder) {
        flushSave();
      } else if (failedOrder) {
        setMessage('alert', 'Save failed. Please retry.', failedOrder);
      }
    });
}

function moveCard(id, targetIndex) {
  const currentIndex = order.indexOf(id);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length || currentIndex === targetIndex) return;
  const focusedControl = document.activeElement;
  const restoreFocus = focusedControl instanceof HTMLElement && cardByElement(id)?.contains(focusedControl)
    ? focusedControl
    : undefined;
  order.splice(currentIndex, 1);
  order.splice(targetIndex, 0, id);
  applyOrder({ animate: true });
  restoreFocus?.focus({ preventScroll: true });
  requestSave();
}

function createCard(card) {
  const item = document.createElement('li');
  item.dataset.cardId = card.id;
  const title = document.createElement('h2');
  title.textContent = card.title;
  const body = document.createElement('p');
  body.textContent = card.body;
  const moveUp = document.createElement('button');
  moveUp.textContent = 'Move up';
  moveUp.addEventListener('click', () => moveCard(card.id, order.indexOf(card.id) - 1));
  const moveDown = document.createElement('button');
  moveDown.textContent = 'Move down';
  moveDown.addEventListener('click', () => moveCard(card.id, order.indexOf(card.id) + 1));
  const handle = document.createElement('button');
  handle.textContent = `Move card ${card.id}`;
  handle.addEventListener('pointerdown', (event) => startDrag(event, card.id, handle));
  item.append(title, body, moveUp, moveDown, handle);
  return item;
}

function startDrag(event, id, handle) {
  if (event.button !== 0) return;
  let active = true;
  handle.setPointerCapture(event.pointerId);
  const finish = (upEvent) => {
    if (!active) return;
    active = false;
    handle.removeEventListener('pointerup', finish);
    handle.removeEventListener('pointercancel', cancel);
    if (upEvent.type !== 'pointerup') return;
    const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('[data-card-id]');
    if (!target || !list?.contains(target) || target.dataset.cardId === id) return;
    const remaining = order.filter((cardId) => cardId !== id);
    moveCard(id, remaining.indexOf(target.dataset.cardId) + 1);
  };
  const cancel = () => finish({ type: 'pointercancel' });
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', cancel);
}

function showBoard() {
  list = document.createElement('ol');
  list.setAttribute('aria-label', 'Board');
  for (const card of cards) list.append(createCard(card));
  app.append(list);
  applyOrder({ animate: false });
}

function renderVisibility() {
  toggle.textContent = boardVisible ? 'Hide board' : 'Show board';
  if (boardVisible) {
    showBoard();
  } else {
    cancelAnimations();
    list?.remove();
    list = undefined;
  }
}

toggle.addEventListener('click', () => {
  boardVisible = !boardVisible;
  renderVisibility();
});

renderVisibility();
