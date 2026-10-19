import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const cardsById = new Map(cards.map((card) => [card.id, card]));
let order = cards.map((card) => card.id);
let visible = true;
let board;
let activeAnimations = new Set();

const toggle = document.createElement('button');
const status = document.createElement('p');
const alert = document.createElement('p');
const retry = document.createElement('button');

status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
alert.setAttribute('role', 'alert');
retry.type = 'button';
retry.textContent = 'Retry save';
retry.hidden = true;

app.append(toggle, status, alert, retry);

function setSaveFeedback(message, canRetry = false) {
  status.textContent = canRetry ? '' : message;
  alert.textContent = canRetry ? message : '';
  retry.hidden = !canRetry;
}

class SaveCoordinator {
  #inFlight = false;
  #latestSnapshot = null;

  schedule(ids) {
    this.#latestSnapshot = [...ids];
    setSaveFeedback('Saving');
    void this.#flush();
  }

  retry() {
    this.schedule(order);
  }

  async #flush() {
    if (this.#inFlight) return;

    while (this.#latestSnapshot) {
      const snapshot = this.#latestSnapshot;
      this.#latestSnapshot = null;
      this.#inFlight = true;

      try {
        await saveOrder(snapshot);
      } catch {
        this.#inFlight = false;
        if (this.#latestSnapshot) continue;
        setSaveFeedback('Could not save the card order.', true);
        return;
      }

      this.#inFlight = false;
    }

    setSaveFeedback('Saved');
  }
}

const saves = new SaveCoordinator();
retry.addEventListener('click', () => saves.retry());

function cancelAnimations() {
  for (const animation of activeAnimations) animation.cancel();
  activeAnimations.clear();
}

function readCardRects() {
  return new Map([...board.children].map((card) => [card.dataset.cardId, card.getBoundingClientRect()]));
}

function playReorderTransition(firstRects) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (const card of board.children) {
    const first = firstRects.get(card.dataset.cardId);
    const last = card.getBoundingClientRect();
    if (!first) continue;

    const x = first.left - last.left;
    const y = first.top - last.top;
    if (x === 0 && y === 0) continue;

    const animation = card.animate(
      [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }],
      { duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
    activeAnimations.add(animation);
    animation.finished.catch(() => {}).finally(() => activeAnimations.delete(animation));
  }
}

function createCard(card) {
  const item = document.createElement('li');
  item.dataset.cardId = card.id;
  item.innerHTML = `<h2>${card.title}</h2><p>${card.body}</p>`;

  const moveUp = document.createElement('button');
  moveUp.type = 'button';
  moveUp.textContent = 'Move up';
  moveUp.addEventListener('click', () => moveCard(card.id, order.indexOf(card.id) - 1, moveUp));

  const moveDown = document.createElement('button');
  moveDown.type = 'button';
  moveDown.textContent = 'Move down';
  moveDown.addEventListener('click', () => moveCard(card.id, order.indexOf(card.id) + 1, moveDown));

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.textContent = `Move card ${card.id}`;
  handle.draggable = true;
  handle.setAttribute('aria-label', `Move card ${card.id}`);
  handle.addEventListener('dragstart', (event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.id);
    item.classList.add('is-dragging');
  });
  handle.addEventListener('dragend', () => item.classList.remove('is-dragging'));

  item.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });
  item.addEventListener('drop', (event) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain');
    if (!cardsById.has(draggedId) || draggedId === card.id) return;
    moveCard(draggedId, order.indexOf(card.id));
  });

  item.append(moveUp, moveDown, handle);
  return item;
}

function updateBoardOrder() {
  const cardsByElementId = new Map([...board.children].map((item) => [item.dataset.cardId, item]));
  const fragment = document.createDocumentFragment();
  for (const id of order) fragment.append(cardsByElementId.get(id));
  board.append(fragment);
}

function moveCard(id, targetIndex, focusControl) {
  const fromIndex = order.indexOf(id);
  if (fromIndex < 0 || targetIndex < 0 || targetIndex >= order.length || fromIndex === targetIndex) return;

  const firstRects = readCardRects();
  cancelAnimations();
  const nextOrder = [...order];
  nextOrder.splice(fromIndex, 1);
  nextOrder.splice(targetIndex, 0, id);
  order = nextOrder;
  updateBoardOrder();
  playReorderTransition(firstRects);
  focusControl?.focus();
  saves.schedule(order);
}

function showBoard() {
  board = document.createElement('ol');
  board.setAttribute('aria-label', 'Board');
  for (const id of order) board.append(createCard(cardsById.get(id)));
  app.append(board);
}

function renderVisibility() {
  toggle.textContent = visible ? 'Hide board' : 'Show board';
  if (visible) showBoard();
  else {
    cancelAnimations();
    board?.remove();
    board = undefined;
  }
}

toggle.addEventListener('click', () => {
  visible = !visible;
  renderVisibility();
});
window.addEventListener('resize', cancelAnimations);

renderVisibility();
