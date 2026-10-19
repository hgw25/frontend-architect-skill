import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const cardById = new Map(cards.map((card) => [card.id, card]));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let order = cards.map((card) => card.id);
let boardVisible = true;
let list = null;
let draggedId = null;
let revision = 0;
let savedRevision = 0;
let saving = false;
let saveFailed = false;

// The map is also the ownership record for animation callbacks. Replacing an
// animation prevents an older completion callback from touching the new one.
const animations = new Map();

const controls = document.createElement('div');
controls.className = 'board-controls';

const toggleButton = document.createElement('button');
toggleButton.id = 'toggle';
toggleButton.type = 'button';

const saveState = document.createElement('div');
saveState.className = 'save-state';

const status = document.createElement('p');
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');

const saveError = document.createElement('p');
saveError.className = 'save-error';
saveError.setAttribute('role', 'alert');
saveError.hidden = true;

const retryButton = document.createElement('button');
retryButton.type = 'button';
retryButton.textContent = 'Retry save';
retryButton.hidden = true;
retryButton.addEventListener('click', () => {
  saveFailed = false;
  retryButton.hidden = true;
  void flushLatestOrder();
});

saveState.append(status, saveError, retryButton);
controls.append(toggleButton, saveState);
app.append(controls);

function makeCard(id) {
  const card = cardById.get(id);
  const item = document.createElement('li');
  item.dataset.cardId = id;

  const title = document.createElement('h2');
  title.textContent = card.title;

  const body = document.createElement('p');
  body.textContent = card.body;

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const moveUp = document.createElement('button');
  moveUp.type = 'button';
  moveUp.dataset.move = 'up';
  moveUp.textContent = 'Move up';

  const moveDown = document.createElement('button');
  moveDown.type = 'button';
  moveDown.dataset.move = 'down';
  moveDown.textContent = 'Move down';

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'drag-handle';
  handle.draggable = true;
  handle.textContent = `Move card ${id}`;

  actions.append(moveUp, moveDown, handle);
  item.append(title, body, actions);
  return item;
}

function showBoard() {
  if (list) return;

  list = document.createElement('ol');
  list.setAttribute('aria-label', 'Board');
  const fragment = document.createDocumentFragment();
  for (const id of order) fragment.append(makeCard(id));
  list.append(fragment);
  app.append(list);
}

function stopAnimations() {
  for (const animation of animations.values()) animation.cancel();
  animations.clear();
}

function clearDragState() {
  draggedId = null;
  list?.querySelector('.is-dragging')?.classList.remove('is-dragging');
  list?.querySelector('.drag-target')?.classList.remove('drag-target');
}

function hideBoard() {
  stopAnimations();
  clearDragState();
  list?.remove();
  list = null;
}

function updateToggle() {
  toggleButton.textContent = boardVisible ? 'Hide board' : 'Show board';
  toggleButton.setAttribute('aria-expanded', String(boardVisible));
}

toggleButton.addEventListener('click', () => {
  boardVisible = !boardVisible;
  if (boardVisible) showBoard();
  else hideBoard();
  updateToggle();
});

function rectsFor(items) {
  const result = new Map();
  for (const item of items) result.set(item, item.getBoundingClientRect());
  return result;
}

function animateFrom(previousRects, items) {
  if (reducedMotion.matches) return;

  // All post-mutation reads happen together, so one move incurs one layout
  // calculation rather than one calculation per card.
  const nextRects = rectsFor(items);
  for (const item of items) {
    const previous = previousRects.get(item);
    const next = nextRects.get(item);
    if (!previous || !next) continue;

    const x = previous.left - next.left;
    const y = previous.top - next.top;
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) continue;

    const animation = item.animate(
      [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }],
      { duration: 300, easing: 'cubic-bezier(.4, 0, .2, 1)' },
    );
    animations.set(item, animation);
    animation.onfinish = animation.oncancel = () => {
      if (animations.get(item) === animation) animations.delete(item);
    };
  }
}

function moveCard(id, destinationIndex) {
  if (!list) return false;

  const fromIndex = order.indexOf(id);
  const toIndex = Math.max(0, Math.min(destinationIndex, order.length - 1));
  if (fromIndex < 0 || fromIndex === toIndex) return false;

  const children = Array.from(list.children);
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  const affected = new Set(children.slice(start, end + 1));
  for (const item of animations.keys()) affected.add(item);

  // getBoundingClientRect includes the currently displayed transform. Capture
  // that first, then cancel, so a rapid second move begins at the visible spot.
  const previousRects = reducedMotion.matches ? null : rectsFor(affected);
  stopAnimations();

  const [movedId] = order.splice(fromIndex, 1);
  order.splice(toIndex, 0, movedId);

  const movingItem = children[fromIndex];
  const targetItem = children[toIndex];
  if (fromIndex < toIndex) targetItem.after(movingItem);
  else targetItem.before(movingItem);

  if (previousRects) animateFrom(previousRects, affected);
  queueSave();
  return true;
}

listDelegationSetup();

function listDelegationSetup() {
  app.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-move]');
    const item = button?.closest('[data-card-id]');
    if (!button || !item || !list?.contains(item)) return;

    const index = order.indexOf(item.dataset.cardId);
    const delta = button.dataset.move === 'up' ? -1 : 1;
    moveCard(item.dataset.cardId, index + delta);
    // Moving the existing node normally preserves focus. Explicitly restoring
    // it also covers browsers that briefly detach focus during DOM reordering.
    button.focus({ preventScroll: true });
  });

  app.addEventListener('dragstart', (event) => {
    const handle = event.target.closest('.drag-handle');
    const item = handle?.closest('[data-card-id]');
    if (!handle || !item || !list?.contains(item)) return;

    draggedId = item.dataset.cardId;
    item.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedId);
  });

  app.addEventListener('dragover', (event) => {
    const item = event.target.closest('[data-card-id]');
    if (!draggedId || !item || !list?.contains(item)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    list.querySelector('.drag-target')?.classList.remove('drag-target');
    if (item.dataset.cardId !== draggedId) item.classList.add('drag-target');
  });

  app.addEventListener('drop', (event) => {
    const item = event.target.closest('[data-card-id]');
    if (!draggedId || !item || !list?.contains(item)) return;
    event.preventDefault();
    const id = draggedId;
    const targetIndex = order.indexOf(item.dataset.cardId);
    clearDragState();
    moveCard(id, targetIndex);
  });

  app.addEventListener('dragend', clearDragState);
}

function renderSaveState(message, failed = false) {
  status.textContent = failed ? '' : message;
  saveError.textContent = failed ? message : '';
  saveError.hidden = !failed;
  retryButton.hidden = !failed;
}

function queueSave() {
  revision += 1;
  saveFailed = false;
  retryButton.hidden = true;
  renderSaveState('Saving…');
  if (!saving) void flushLatestOrder();
}

async function flushLatestOrder() {
  if (saving || savedRevision === revision) return;

  saving = true;
  saveFailed = false;
  renderSaveState('Saving…');
  const requestRevision = revision;
  const requestOrder = [...order];

  try {
    await saveOrder(requestOrder);
    savedRevision = Math.max(savedRevision, requestRevision);
  } catch {
    saveFailed = true;
  } finally {
    saving = false;
  }

  if (saveFailed) {
    renderSaveState('Could not save changes.', true);
  } else if (savedRevision < revision) {
    // Coalesce every edit made during the request into the next latest snapshot.
    void flushLatestOrder();
  } else {
    renderSaveState('Saved');
  }
}

window.addEventListener('scroll', stopAnimations, { capture: true, passive: true });
window.addEventListener('resize', stopAnimations, { passive: true });
reducedMotion.addEventListener('change', stopAnimations);

updateToggle();
showBoard();
