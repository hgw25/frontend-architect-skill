import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const cardsById = new Map(cards.map((card) => [card.id, card]));
const cardNodes = new Map();
let order = cards.map((card) => card.id);
let visible = true;
let board;
const animations = new Map();

const toggle = document.createElement('button');
const status = document.createElement('p');
const feedback = document.createElement('div');
status.setAttribute('role', 'status');
feedback.setAttribute('aria-live', 'assertive');
app.append(toggle, status, feedback);

class SaveQueue {
  constructor(onState) {
    this.onState = onState;
    this.inFlight = false;
    this.pending = null;
    this.failed = null;
  }

  submit(ids) {
    this.pending = [...ids];
    this.failed = null;
    this.onState({ state: 'saving' });
    this.flush();
  }

  retry() {
    if (!this.failed) return;
    this.pending = this.failed;
    this.failed = null;
    this.onState({ state: 'saving' });
    this.flush();
  }

  async flush() {
    if (this.inFlight || !this.pending) return;
    const snapshot = this.pending;
    this.pending = null;
    this.inFlight = true;
    try {
      await saveOrder(snapshot);
      this.inFlight = false;
      if (this.pending) {
        this.flush();
      } else {
        this.onState({ state: 'saved' });
      }
    } catch (error) {
      this.inFlight = false;
      if (this.pending) {
        this.flush();
        return;
      }
      this.failed = snapshot;
      this.onState({ state: 'failed', error });
    }
  }
}

const saves = new SaveQueue((update) => {
  feedback.replaceChildren();
  if (update.state === 'saving') {
    status.textContent = 'Saving…';
  } else if (update.state === 'saved') {
    status.textContent = 'Saved';
  } else {
    status.textContent = '';
    const alert = document.createElement('p');
    alert.setAttribute('role', 'alert');
    alert.textContent = 'Save failed. ';
    const retry = document.createElement('button');
    retry.textContent = 'Retry save';
    retry.addEventListener('click', () => saves.retry());
    alert.append(retry);
    feedback.append(alert);
  }
});

function createCard(card) {
  const item = document.createElement('li');
  item.dataset.cardId = card.id;
  const title = document.createElement('h2');
  title.textContent = card.title;
  const body = document.createElement('p');
  body.textContent = card.body;
  const up = document.createElement('button');
  up.textContent = 'Move up';
  up.addEventListener('click', () => move(card.id, -1, up));
  const down = document.createElement('button');
  down.textContent = 'Move down';
  down.addEventListener('click', () => move(card.id, 1, down));
  const handle = document.createElement('button');
  handle.textContent = `Move card ${card.id}`;
  handle.addEventListener('pointerdown', (event) => beginDrag(event, card.id, item));
  item.append(title, body, up, down, handle);
  return item;
}

function getCardNode(id) {
  if (!cardNodes.has(id)) cardNodes.set(id, createCard(cardsById.get(id)));
  return cardNodes.get(id);
}

function cancelAnimations() {
  for (const animation of animations.values()) animation.cancel();
  animations.clear();
}

function snapshotRects() {
  return new Map(order.map((id) => [id, getCardNode(id).getBoundingClientRect()]));
}

function playReorder(firstRects) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const id of order) {
    const first = firstRects.get(id);
    const item = getCardNode(id);
    const last = item.getBoundingClientRect();
    if (!first) continue;
    const x = first.left - last.left;
    const y = first.top - last.top;
    if (Math.abs(x) < 1 && Math.abs(y) < 1) continue;
    const animation = item.animate(
      [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }],
      { duration: 480, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
    animations.set(id, animation);
    animation.finished.catch(() => {}).finally(() => {
      if (animations.get(id) === animation) animations.delete(id);
    });
  }
}

function renderOrder(focusTarget) {
  if (!board) return;
  const firstRects = snapshotRects();
  cancelAnimations();
  for (let index = 0; index < order.length; index += 1) {
    const item = getCardNode(order[index]);
    if (board.children[index] !== item) board.insertBefore(item, board.children[index] ?? null);
  }
  playReorder(firstRects);
  focusTarget?.focus();
}

function commitOrder(focusTarget) {
  renderOrder(focusTarget);
  saves.submit(order);
}

function move(id, delta, focusTarget) {
  const from = order.indexOf(id);
  const to = from + delta;
  if (to < 0 || to >= order.length) return;
  [order[from], order[to]] = [order[to], order[from]];
  commitOrder(focusTarget);
}

function moveAfter(id, targetId) {
  if (id === targetId) return;
  const from = order.indexOf(id);
  const target = order.indexOf(targetId);
  if (from < 0 || target < 0) return;
  order.splice(from, 1);
  const destination = order.indexOf(targetId) + 1;
  order.splice(destination, 0, id);
  commitOrder();
}

function beginDrag(event, id, item) {
  if (event.button !== 0) return;
  event.preventDefault();
  const pointerId = event.pointerId;
  const handle = event.currentTarget;
  let targetId = null;
  item.classList.add('is-dragging');
  handle.setPointerCapture(pointerId);
  const updateTarget = (pointerEvent) => {
    const target = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest('[data-card-id]');
    targetId = target && target !== item ? target.dataset.cardId : null;
  };
  const finish = (pointerEvent) => {
    updateTarget(pointerEvent);
    item.classList.remove('is-dragging');
    handle.removeEventListener('pointermove', updateTarget);
    handle.removeEventListener('pointerup', finish);
    handle.removeEventListener('pointercancel', cancel);
    if (targetId) moveAfter(id, targetId);
  };
  const cancel = () => {
    item.classList.remove('is-dragging');
    handle.removeEventListener('pointermove', updateTarget);
    handle.removeEventListener('pointerup', finish);
    handle.removeEventListener('pointercancel', cancel);
  };
  handle.addEventListener('pointermove', updateTarget);
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', cancel);
}

function showBoard() {
  board = document.createElement('ol');
  board.setAttribute('aria-label', 'Board');
  for (const id of order) board.append(getCardNode(id));
  app.append(board);
}

function updateVisibility() {
  toggle.textContent = visible ? 'Hide board' : 'Show board';
  if (visible) {
    showBoard();
  } else {
    cancelAnimations();
    board?.remove();
    board = null;
  }
}

toggle.addEventListener('click', () => {
  visible = !visible;
  updateVisibility();
});

updateVisibility();
