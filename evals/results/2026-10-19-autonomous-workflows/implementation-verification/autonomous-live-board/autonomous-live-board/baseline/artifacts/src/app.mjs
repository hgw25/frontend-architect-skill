import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const cardById = new Map(cards.map(card => [card.id, card]));
const order = cards.map(card => card.id);
const elements = new Map();
const controls = new Map();
const runningAnimations = new Set();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let boardVisible = true;
let drag = null;
let revision = 0;
let savedRevision = 0;
let saveInFlight = false;
let retryRequired = false;

const toggle = document.createElement('button');
toggle.id = 'toggle';
toggle.type = 'button';

const saveStatus = document.createElement('p');
saveStatus.setAttribute('role', 'status');
saveStatus.textContent = 'All changes saved';

const saveError = document.createElement('div');
saveError.className = 'save-error';
saveError.setAttribute('role', 'alert');
saveError.hidden = true;

const errorMessage = document.createElement('span');
const retryButton = document.createElement('button');
retryButton.type = 'button';
retryButton.textContent = 'Retry save';
saveError.append(errorMessage, retryButton);

const list = document.createElement('ol');
list.setAttribute('aria-label', 'Board');

function makeButton(label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  return button;
}

function createCard(card) {
  const item = document.createElement('li');
  item.dataset.cardId = card.id;

  const heading = document.createElement('h2');
  heading.textContent = card.title;
  const body = document.createElement('p');
  body.textContent = card.body;

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const up = makeButton('Move up');
  const down = makeButton('Move down');
  const handle = makeButton(`Move card ${card.id}`);
  handle.className = 'drag-handle';
  handle.setAttribute('aria-label', `Move card ${card.id}`);
  handle.title = 'Drag to reorder';
  actions.append(up, down, handle);
  item.append(heading, body, actions);

  up.addEventListener('click', () => moveBy(card.id, -1));
  down.addEventListener('click', () => moveBy(card.id, 1));
  handle.addEventListener('pointerdown', event => startDrag(event, card.id, handle));

  elements.set(card.id, item);
  controls.set(card.id, { up, down });
  return item;
}

for (const id of order) list.append(createCard(cardById.get(id)));
app.append(toggle, saveStatus, saveError, list);

function updateToggle() {
  toggle.textContent = boardVisible ? 'Hide board' : 'Show board';
}

function updateBoundaryControls() {
  for (let index = 0; index < order.length; index += 1) {
    const { up, down } = controls.get(order[index]);
    up.disabled = index === 0;
    down.disabled = index === order.length - 1;
  }
}

function cancelAnimations() {
  for (const animation of [...runningAnimations]) animation.cancel();
  runningAnimations.clear();
}

function animateChanges(ids, previousRects) {
  if (reduceMotion.matches || !boardVisible || !list.isConnected) return;

  for (const id of ids) {
    const element = elements.get(id);
    const previous = previousRects.get(id);
    const next = element.getBoundingClientRect();
    const x = previous.left - next.left;
    const y = previous.top - next.top;
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) continue;

    const animation = element.animate(
      [
        { transform: `translate(${x}px, ${y}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' },
    );
    runningAnimations.add(animation);
    const cleanUp = () => runningAnimations.delete(animation);
    animation.addEventListener('finish', () => {
      cleanUp();
      animation.cancel();
    }, { once: true });
    animation.addEventListener('cancel', cleanUp, { once: true });
  }
}

function placeCard(id, destination) {
  const source = order.indexOf(id);
  if (source < 0 || destination < 0 || destination >= order.length || source === destination) return false;

  const first = Math.min(source, destination);
  const last = Math.max(source, destination);
  const affected = order.slice(first, last + 1);
  const previousRects = new Map(affected.map(cardId => [cardId, elements.get(cardId).getBoundingClientRect()]));

  // Capture the current visual position before interrupting an earlier move. The
  // replacement animation can therefore continue from the exact on-screen point.
  for (const cardId of affected) {
    for (const animation of elements.get(cardId).getAnimations()) animation.cancel();
  }

  order.splice(source, 1);
  order.splice(destination, 0, id);
  const followingId = order[destination + 1];
  const focusedControl = elements.get(id).contains(document.activeElement) ? document.activeElement : null;
  list.insertBefore(elements.get(id), followingId ? elements.get(followingId) : null);
  // Moving a subtree can make some browsers drop focus even though its nodes are
  // retained. Restore the same control without changing the user's scroll point.
  focusedControl?.focus({ preventScroll: true });
  updateBoundaryControls();
  animateChanges(affected, previousRects);
  queueSave();
  return true;
}

function moveBy(id, delta) {
  const source = order.indexOf(id);
  placeCard(id, source + delta);
}

function startDrag(event, id, handle) {
  if (event.button !== 0 || drag) return;
  event.preventDefault();
  drag = { id, pointerId: event.pointerId, handle, moved: false };
  handle.setPointerCapture(event.pointerId);
  elements.get(id).classList.add('is-dragging');
  handle.setAttribute('aria-pressed', 'true');

  handle.addEventListener('pointermove', dragMove);
  handle.addEventListener('pointerup', finishDrag, { once: true });
  handle.addEventListener('pointercancel', finishDrag, { once: true });
}

function dragMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-card-id]');
  const targetId = target?.dataset.cardId;
  if (!targetId || targetId === drag.id) return;
  drag.moved = placeCard(drag.id, order.indexOf(targetId)) || drag.moved;
}

function finishDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const { id, handle } = drag;
  handle.removeEventListener('pointermove', dragMove);
  handle.removeEventListener('pointerup', finishDrag);
  handle.removeEventListener('pointercancel', finishDrag);
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  handle.removeAttribute('aria-pressed');
  elements.get(id).classList.remove('is-dragging');
  drag = null;
}

function showSaveError(message) {
  saveStatus.textContent = '';
  errorMessage.textContent = message;
  saveError.hidden = false;
}

function queueSave() {
  revision += 1;
  retryRequired = false;
  saveError.hidden = true;
  saveStatus.textContent = 'Saving changes…';
  void flushLatestOrder();
}

async function flushLatestOrder() {
  if (saveInFlight || retryRequired || savedRevision === revision) return;

  saveInFlight = true;
  const savingRevision = revision;
  const snapshot = [...order];
  try {
    await saveOrder(snapshot);
    savedRevision = savingRevision;
    if (savedRevision === revision) saveStatus.textContent = 'Saved';
  } catch (error) {
    retryRequired = true;
    const detail = error instanceof Error && error.message ? error.message : 'Save failed';
    showSaveError(`${detail}. Your latest order is still available.`);
  } finally {
    saveInFlight = false;
    if (!retryRequired && savedRevision < revision) void flushLatestOrder();
  }
}

retryButton.addEventListener('click', () => {
  retryRequired = false;
  saveError.hidden = true;
  saveStatus.textContent = 'Saving changes…';
  void flushLatestOrder();
});

toggle.addEventListener('click', () => {
  boardVisible = !boardVisible;
  cancelAnimations();
  if (drag) finishDrag({ pointerId: drag.pointerId });
  if (boardVisible) app.append(list);
  else list.remove();
  updateToggle();
});

window.addEventListener('resize', cancelAnimations);
window.addEventListener('scroll', cancelAnimations, { passive: true });
reduceMotion.addEventListener('change', event => {
  if (event.matches) cancelAnimations();
});

updateToggle();
updateBoundaryControls();
