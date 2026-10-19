import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';

const app = document.querySelector('#app');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let order = cards.map((card) => card.id);
let boardView = null;
let pendingSave = null;
let saveInFlight = false;
let saveFailed = false;

const toggle = document.createElement('button');
const status = document.createElement('p');
const error = document.createElement('div');
const boardHost = document.createElement('div');

toggle.id = 'toggle';
toggle.textContent = 'Hide board';
status.setAttribute('role', 'status');
error.hidden = true;
error.setAttribute('role', 'alert');
app.append(toggle, status, error, boardHost);

function createButton(label, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.action = action;
  return button;
}

function createCardNode(card) {
  const item = document.createElement('li');
  item.dataset.cardId = card.id;

  const heading = document.createElement('h2');
  heading.textContent = card.title;
  const body = document.createElement('p');
  body.textContent = card.body;
  const up = createButton('Move up', 'up');
  const down = createButton('Move down', 'down');
  const handle = createButton(`Move card ${card.id}`, 'drag');
  handle.className = 'drag-handle';
  item.append(heading, body, up, down, handle);
  return item;
}

function captureRects(nodes) {
  return new Map(order.map((id) => [id, nodes.get(id).getBoundingClientRect()]));
}

function cancelAnimations() {
  if (!boardView) return;
  for (const animation of boardView.animations.values()) animation.cancel();
  boardView.animations.clear();
}

function playReorderAnimation(firstRects) {
  if (!boardView || !firstRects || reducedMotion.matches) return;
  const lastRects = captureRects(boardView.nodes);

  for (const id of order) {
    const first = firstRects.get(id);
    const last = lastRects.get(id);
    if (!first || !last) continue;
    const x = first.left - last.left;
    const y = first.top - last.top;
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) continue;

    const node = boardView.nodes.get(id);
    const animation = node.animate(
      [
        { transform: `translate(${x}px, ${y}px)` },
        { transform: 'translate(0px, 0px)' },
      ],
      { duration: 480, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
    boardView.animations.set(id, animation);
    animation.finished
      .catch(() => {})
      .finally(() => {
        if (boardView?.animations.get(id) === animation) {
          boardView.animations.delete(id);
        }
      });
  }
}

function syncBoardDom() {
  if (!boardView) return;
  const fragment = document.createDocumentFragment();
  for (const id of order) fragment.append(boardView.nodes.get(id));
  boardView.list.append(fragment);

  order.forEach((id, index) => {
    const item = boardView.nodes.get(id);
    item.querySelector('[data-action="up"]').disabled = index === 0;
    item.querySelector('[data-action="down"]').disabled = index === order.length - 1;
  });
}

function focusedControl() {
  const control = document.activeElement?.closest?.('[data-card-id] button');
  if (!control) return null;
  return {
    id: control.closest('[data-card-id]').dataset.cardId,
    action: control.dataset.action,
    element: control,
  };
}

function restoreFocus(target) {
  if (!target || document.activeElement === target.element || !boardView) return;
  const card = boardView.nodes.get(target.id);
  card?.querySelector(`[data-action="${target.action}"]`)?.focus({ preventScroll: true });
}

function commitOrder(nextOrder) {
  if (nextOrder.every((id, index) => id === order[index])) return;

  const focus = focusedControl();
  const firstRects = boardView && !reducedMotion.matches
    ? captureRects(boardView.nodes)
    : null;
  cancelAnimations();
  order = nextOrder;
  syncBoardDom();
  restoreFocus(focus);
  playReorderAnimation(firstRects);
  enqueueSave(order);
}

function moveBy(id, delta) {
  const from = order.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return;
  const next = [...order];
  [next[from], next[to]] = [next[to], next[from]];
  commitOrder(next);
}

function moveToCard(id, targetId) {
  const from = order.indexOf(id);
  const target = order.indexOf(targetId);
  if (from < 0 || target < 0 || from === target) return;
  const next = order.filter((cardId) => cardId !== id);
  next.splice(target, 0, id);
  commitOrder(next);
}

function clearDrag() {
  if (!boardView?.drag) return;
  boardView.nodes.get(boardView.drag.id)?.classList.remove('is-dragging');
  boardView.nodes.get(boardView.drag.targetId)?.classList.remove('is-drop-target');
  boardView.drag = null;
}

function mountBoard() {
  const list = document.createElement('ol');
  list.setAttribute('aria-label', 'Board');
  const nodes = new Map(cards.map((card) => [card.id, createCardNode(card)]));
  boardView = { list, nodes, animations: new Map(), drag: null };
  syncBoardDom();
  boardHost.append(list);

  list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    const id = button?.closest('[data-card-id]')?.dataset.cardId;
    if (!id) return;
    if (button.dataset.action === 'up') moveBy(id, -1);
    if (button.dataset.action === 'down') moveBy(id, 1);
  });

  list.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-action="drag"]');
    if (!handle || event.button !== 0) return;
    event.preventDefault();
    const id = handle.closest('[data-card-id]').dataset.cardId;
    boardView.drag = { id, targetId: id, pointerId: event.pointerId };
    boardView.nodes.get(id).classList.add('is-dragging');
    list.setPointerCapture(event.pointerId);
  });

  list.addEventListener('pointermove', (event) => {
    if (!boardView?.drag || boardView.drag.pointerId !== event.pointerId) return;
    const targetId = document.elementFromPoint(event.clientX, event.clientY)
      ?.closest('[data-card-id]')?.dataset.cardId;
    if (!targetId || targetId === boardView.drag.targetId) return;
    boardView.nodes.get(boardView.drag.targetId)?.classList.remove('is-drop-target');
    boardView.drag.targetId = targetId;
    if (targetId !== boardView.drag.id) {
      boardView.nodes.get(targetId).classList.add('is-drop-target');
    }
  });

  list.addEventListener('pointerup', (event) => {
    if (!boardView?.drag || boardView.drag.pointerId !== event.pointerId) return;
    const { id, targetId } = boardView.drag;
    clearDrag();
    moveToCard(id, targetId);
  });
  list.addEventListener('pointercancel', clearDrag);
}

function unmountBoard() {
  if (!boardView) return;
  clearDrag();
  cancelAnimations();
  boardView.list.remove();
  boardView = null;
}

function showSaveError(cause) {
  error.replaceChildren();
  const message = document.createElement('span');
  message.textContent = `${cause?.message || 'Save failed'}. `;
  const retry = createButton('Retry save', 'retry');
  retry.addEventListener('click', retrySave);
  error.append(message, retry);
  error.hidden = false;
}

function clearSaveError() {
  error.hidden = true;
  error.replaceChildren();
}

function enqueueSave(ids) {
  pendingSave = [...ids];
  saveFailed = false;
  clearSaveError();
  flushSave();
}

async function flushSave() {
  if (saveInFlight || !pendingSave || saveFailed) return;
  const snapshot = pendingSave;
  pendingSave = null;
  saveInFlight = true;
  status.textContent = 'Saving…';

  try {
    await saveOrder(snapshot);
    saveInFlight = false;
    if (pendingSave) {
      flushSave();
    } else {
      status.textContent = 'Saved';
    }
  } catch (cause) {
    saveInFlight = false;
    pendingSave = [...order];
    saveFailed = true;
    status.textContent = '';
    showSaveError(cause);
  }
}

function retrySave() {
  pendingSave = [...order];
  saveFailed = false;
  clearSaveError();
  flushSave();
}

toggle.addEventListener('click', () => {
  if (boardView) {
    unmountBoard();
    toggle.textContent = 'Show board';
  } else {
    mountBoard();
    toggle.textContent = 'Hide board';
  }
});

window.addEventListener('resize', cancelAnimations);
reducedMotion.addEventListener('change', cancelAnimations);
mountBoard();
