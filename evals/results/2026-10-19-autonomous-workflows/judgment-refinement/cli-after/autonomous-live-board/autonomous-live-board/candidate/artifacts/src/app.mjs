import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const cardById = new Map(cards.map(card => [card.id, card]));
let order = cards.map(card => card.id);
let visible = true;
let board;
let status;
let alert;
let activeDrag;
const nodes = new Map();
const animations = new Map();

class SaveCoordinator {
  constructor(onChange) {
    this.onChange = onChange;
    this.inFlight = false;
    this.pending = null;
    this.failed = null;
  }

  request(nextOrder) {
    this.pending = [...nextOrder];
    this.failed = null;
    this.onChange();
    this.sendLatest();
  }

  retry() {
    if (!this.failed) return;
    this.pending = [...this.failed];
    this.failed = null;
    this.onChange();
    this.sendLatest();
  }

  async sendLatest() {
    if (this.inFlight || !this.pending) return;
    const snapshot = this.pending;
    this.pending = null;
    this.inFlight = true;
    this.onChange();
    try {
      await saveOrder(snapshot);
      this.onChange(this.pending ? '' : 'Saved');
    } catch (error) {
      if (this.pending) {
        this.onChange();
      } else {
        this.failed = snapshot;
        this.onChange('Save failed. Retry to save the latest order.');
      }
    } finally {
      this.inFlight = false;
      if (this.pending) this.sendLatest();
    }
  }
}

const saver = new SaveCoordinator(message => updateMessages(message));

function createCard(id) {
  const card = cardById.get(id);
  const item = document.createElement('li');
  item.dataset.cardId = id;
  item.innerHTML = `<h2>${card.title}</h2><p>${card.body}</p>`;
  const up = document.createElement('button');
  up.textContent = 'Move up';
  up.addEventListener('click', () => moveBy(id, -1));
  const down = document.createElement('button');
  down.textContent = 'Move down';
  down.addEventListener('click', () => moveBy(id, 1));
  const handle = document.createElement('button');
  handle.textContent = `Move card ${id}`;
  handle.setAttribute('aria-label', `Move card ${id}`);
  handle.addEventListener('pointerdown', event => startDrag(event, id));
  item.append(up, down, handle);
  nodes.set(id, item);
  return item;
}

function renderBoard({ animate = false } = {}) {
  if (!visible || !board) return;
  const focused = document.activeElement;
  const restoreFocus = board.contains(focused);
  const first = animate ? new Map([...nodes].map(([id, node]) => [id, node.getBoundingClientRect()])) : null;
  for (const id of order) board.append(nodes.get(id) || createCard(id));
  if (restoreFocus && document.activeElement !== focused) focused.focus();
  if (animate) playFlip(first);
}

function playFlip(first) {
  cancelAnimations();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const [id, node] of nodes) {
    const before = first.get(id);
    const after = node.getBoundingClientRect();
    const x = before.left - after.left;
    const y = before.top - after.top;
    if (!x && !y) continue;
    const animation = node.animate(
      [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }],
      { duration: 420, easing: 'cubic-bezier(.2,.75,.25,1)' },
    );
    animations.set(id, animation);
    animation.onfinish = animation.oncancel = () => {
      if (animations.get(id) === animation) animations.delete(id);
    };
  }
}

function cancelAnimations() {
  for (const animation of animations.values()) animation.cancel();
  animations.clear();
}

function moveBy(id, delta) {
  const from = order.indexOf(id);
  moveCard(id, from + delta);
}

function moveCard(id, targetIndex) {
  const from = order.indexOf(id);
  if (from < 0 || targetIndex < 0 || targetIndex >= order.length || from === targetIndex) return;
  order.splice(from, 1);
  order.splice(targetIndex, 0, id);
  renderBoard({ animate: true });
  saver.request(order);
}

function startDrag(event, id) {
  if (event.button !== 0 || !visible) return;
  event.currentTarget.setPointerCapture(event.pointerId);
  activeDrag = { id, pointerId: event.pointerId };
  event.currentTarget.addEventListener('pointerup', finishDrag, { once: true });
  event.currentTarget.addEventListener('pointercancel', cancelDrag, { once: true });
}

function finishDrag(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
  const id = activeDrag.id;
  activeDrag = null;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-card-id]');
  if (!target || !board?.contains(target) || target.dataset.cardId === id) return;
  const from = order.indexOf(id);
  const targetPosition = order.indexOf(target.dataset.cardId);
  moveCard(id, targetPosition + (from > targetPosition ? 1 : 0));
}

function cancelDrag() {
  activeDrag = null;
}

function updateMessages(message = '') {
  if (!status || !alert) return;
  status.textContent = message === 'Saved' ? message : '';
  alert.replaceChildren();
  if (saver.failed) {
    alert.append(message || 'Save failed.');
    const retry = document.createElement('button');
    retry.textContent = 'Retry save';
    retry.addEventListener('click', () => saver.retry());
    alert.append(' ', retry);
  }
}

function showBoard() {
  visible = true;
  const toggle = app.querySelector('#toggle');
  toggle.textContent = 'Hide board';
  board = document.createElement('ol');
  board.setAttribute('aria-label', 'Board');
  app.append(board);
  renderBoard();
}

function hideBoard() {
  visible = false;
  activeDrag = null;
  cancelAnimations();
  board?.remove();
  board = null;
  app.querySelector('#toggle').textContent = 'Show board';
}

function initialize() {
  const toggle = document.createElement('button');
  toggle.id = 'toggle';
  toggle.textContent = 'Hide board';
  toggle.addEventListener('click', () => (visible ? hideBoard() : showBoard()));
  status = document.createElement('p');
  status.setAttribute('role', 'status');
  alert = document.createElement('p');
  alert.setAttribute('role', 'alert');
  app.replaceChildren(toggle, status, alert);
  showBoard();
}

initialize();
