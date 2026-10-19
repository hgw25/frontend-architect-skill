import { saveOrder } from './api.mjs';
import { cards } from './data.mjs';

const app = document.querySelector('#app');
const cardsById = new Map(cards.map((card) => [card.id, card]));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let order = cards.map((card) => card.id);
let boardVisible = true;
let board;
let cardElements = new Map();
let drag = null;

const runningAnimations = new Map();

const toggleButton = document.createElement('button');
toggleButton.type = 'button';

const saveStatus = document.createElement('p');
saveStatus.className = 'save-status';
saveStatus.setAttribute('role', 'status');
saveStatus.setAttribute('aria-live', 'polite');

const saveError = document.createElement('div');
saveError.className = 'save-error';

app.append(toggleButton, saveStatus, saveError);

function createCard(card) {
  const item = document.createElement('li');
  item.dataset.cardId = card.id;

  const title = document.createElement('h2');
  title.textContent = card.title;

  const body = document.createElement('p');
  body.textContent = card.body;

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const up = document.createElement('button');
  up.type = 'button';
  up.textContent = 'Move up';
  up.addEventListener('click', () => moveBy(card.id, -1));

  const down = document.createElement('button');
  down.type = 'button';
  down.textContent = 'Move down';
  down.addEventListener('click', () => moveBy(card.id, 1));

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'drag-handle';
  handle.textContent = `Move card ${card.id}`;
  handle.addEventListener('pointerdown', (event) => beginDrag(event, card.id));

  actions.append(up, down, handle);
  item.append(title, body, actions);
  return item;
}

function mountBoard() {
  board = document.createElement('ol');
  board.setAttribute('aria-label', 'Board');
  cardElements = new Map();

  for (const id of order) {
    const item = createCard(cardsById.get(id));
    cardElements.set(id, item);
    board.append(item);
  }

  app.append(board);
}

function cancelAnimations() {
  for (const animation of runningAnimations.values()) animation.cancel();
  runningAnimations.clear();
}

window.addEventListener('resize', cancelAnimations);
reduceMotion.addEventListener('change', (event) => {
  if (event.matches) cancelAnimations();
});

function unmountBoard() {
  cancelDrag();
  cancelAnimations();
  board?.remove();
  board = undefined;
  cardElements.clear();
}

function updateToggle() {
  toggleButton.textContent = boardVisible ? 'Hide board' : 'Show board';
  toggleButton.setAttribute('aria-expanded', String(boardVisible));
}

toggleButton.addEventListener('click', () => {
  boardVisible = !boardVisible;
  updateToggle();
  if (boardVisible) mountBoard();
  else unmountBoard();
});

function currentRects() {
  return new Map(
    [...cardElements].map(([id, item]) => [id, item.getBoundingClientRect()]),
  );
}

function putElementsInOrder() {
  order.forEach((id, index) => {
    const item = cardElements.get(id);
    if (board.children[index] !== item) {
      board.insertBefore(item, board.children[index] ?? null);
    }
  });
}

function animateFrom(firstRects) {
  if (reduceMotion.matches) return;

  const lastRects = currentRects();
  for (const [id, item] of cardElements) {
    const first = firstRects.get(id);
    const last = lastRects.get(id);
    const x = first.x - last.x;
    const y = first.y - last.y;
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) continue;

    const animation = item.animate(
      [
        { transform: `translate(${x}px, ${y}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
    runningAnimations.set(id, animation);
    animation.finished
      .catch(() => {})
      .finally(() => {
        if (runningAnimations.get(id) === animation) runningAnimations.delete(id);
      });
  }
}

function commitOrder(nextOrder) {
  if (nextOrder.every((id, index) => id === order[index])) return;

  if (!boardVisible) {
    order = nextOrder;
    queueSave();
    return;
  }

  // Read the currently painted positions before cancelling an in-flight move.
  // The next animation therefore starts where the cards actually are, even when
  // several commands arrive during the same transition.
  const firstRects = currentRects();
  const focused = document.activeElement;
  cancelAnimations();
  order = nextOrder;
  putElementsInOrder();
  if (focused instanceof HTMLElement && app.contains(focused)) {
    focused.focus({ preventScroll: true });
  }
  animateFrom(firstRects);
  queueSave();
}

function moveBy(id, delta) {
  const from = order.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return;

  const next = [...order];
  [next[from], next[to]] = [next[to], next[from]];
  commitOrder(next);
}

function moveTo(id, targetId) {
  const from = order.indexOf(id);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return;

  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);
  commitOrder(next);
}

function dragTargetAt(x, y) {
  return document.elementFromPoint(x, y)?.closest('[data-card-id]') ?? null;
}

function updateDragTarget(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const target = dragTargetAt(event.clientX, event.clientY);
  drag.target?.classList.remove('drop-target');
  drag.target = target?.dataset.cardId === drag.id ? null : target;
  drag.target?.classList.add('drop-target');
}

function finishDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  updateDragTarget(event);
  const { id, target } = drag;
  cancelDrag();
  if (target) moveTo(id, target.dataset.cardId);
}

function cancelDrag(event) {
  if (event && drag && event.pointerId !== drag.pointerId) return;
  drag?.source.classList.remove('dragging');
  drag?.target?.classList.remove('drop-target');
  drag = null;
  document.removeEventListener('pointermove', updateDragTarget);
  document.removeEventListener('pointerup', finishDrag);
  document.removeEventListener('pointercancel', cancelDrag);
}

function beginDrag(event, id) {
  if (event.button !== 0 || drag) return;
  event.preventDefault();
  const source = cardElements.get(id);
  drag = { id, pointerId: event.pointerId, source, target: null };
  source.classList.add('dragging');
  document.addEventListener('pointermove', updateDragTarget);
  document.addEventListener('pointerup', finishDrag);
  document.addEventListener('pointercancel', cancelDrag);
}

let desiredRevision = 0;
let desiredOrder = [...order];
let saveInFlight = false;
let failedRevision = null;

function showSaving() {
  saveStatus.textContent = 'Saving…';
  saveError.removeAttribute('role');
  saveError.replaceChildren();
}

function showSaved() {
  saveStatus.textContent = 'Saved';
  saveError.removeAttribute('role');
  saveError.replaceChildren();
}

function showSaveError(error) {
  saveStatus.textContent = '';
  saveError.setAttribute('role', 'alert');

  const message = document.createElement('span');
  message.textContent = `Save failed: ${error.message}`;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Retry save';
  retry.addEventListener('click', () => {
    failedRevision = null;
    showSaving();
    void persistLatest();
  });
  saveError.replaceChildren(message, retry);
}

function queueSave() {
  desiredRevision += 1;
  desiredOrder = [...order];
  failedRevision = null;
  showSaving();
  void persistLatest();
}

async function persistLatest() {
  if (saveInFlight || failedRevision !== null) return;

  const revision = desiredRevision;
  const snapshot = [...desiredOrder];
  saveInFlight = true;
  let failure;
  try {
    await saveOrder(snapshot);
  } catch (error) {
    failure = error instanceof Error ? error : new Error('Save failed');
  } finally {
    saveInFlight = false;
  }

  if (failure) {
    if (desiredRevision > revision) {
      void persistLatest();
    } else {
      failedRevision = revision;
      showSaveError(failure);
    }
    return;
  }

  if (desiredRevision > revision) {
    void persistLatest();
  } else {
    showSaved();
  }
}

updateToggle();
mountBoard();
