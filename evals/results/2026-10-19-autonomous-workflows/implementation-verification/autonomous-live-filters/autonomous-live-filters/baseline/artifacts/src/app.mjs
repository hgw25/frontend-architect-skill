import { today } from './data.mjs';
import { queryOrders, queryProducts } from './query.mjs';
import { node, field, input, select, button } from './ui.mjs';

const app = document.querySelector('#app');
const PRODUCT_KEYS = ['q', 'category', 'status'];
const ORDER_KEYS = ['q', 'from', 'to', 'status'];
const productCategories = new Set(['', 'wear', 'food', 'home']);
const productStatuses = new Set(['', 'published', 'draft']);
const orderStatuses = new Set(['', 'new', 'paid']);
let requestNumber = 0;

function dateDaysBefore(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const defaultOrderDates = {
  from: dateDaysBefore(today, 29),
  to: today,
};

function valueFromSet(params, name, allowed, fallback) {
  const value = params.get(name);
  return value !== null && allowed.has(value) ? value : fallback;
}

function readProductFilters() {
  const params = new URLSearchParams(location.search);
  return {
    q: params.get('q') ?? '',
    category: valueFromSet(params, 'category', productCategories, ''),
    status: valueFromSet(params, 'status', productStatuses, 'published'),
  };
}

function readOrderFilters() {
  const params = new URLSearchParams(location.search);
  return {
    q: params.get('q') ?? '',
    from: params.get('from') ?? defaultOrderDates.from,
    to: params.get('to') ?? defaultOrderDates.to,
    status: valueFromSet(params, 'status', orderStatuses, ''),
  };
}

function writeFilters(filters, keys, { replace = false, keepEmpty = [] } = {}) {
  const url = new URL(location.href);
  const meaningfulEmptyValues = new Set(keepEmpty);
  for (const key of keys) url.searchParams.delete(key);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' || meaningfulEmptyValues.has(key)) url.searchParams.set(key, value);
  }
  const method = replace ? 'replaceState' : 'pushState';
  history[method](null, '', url);
}

function makePage(title) {
  const nav = node('nav');
  nav.setAttribute('aria-label', 'Pages');
  for (const [name, page] of [['Products', 'products'], ['Orders', 'orders']]) {
    const link = node('a', name);
    link.href = `/?page=${page}`;
    if (title.toLowerCase() === page) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }

  const heading = node('h1', title);
  const form = node('form');
  const feedback = node('div');
  feedback.className = 'feedback';
  const count = node('p');
  count.setAttribute('role', 'status');
  count.setAttribute('aria-live', 'polite');
  const list = node('ul');
  list.setAttribute('aria-label', 'Results');
  app.replaceChildren(nav, heading, form, feedback, count, list);
  return { form, feedback, count, list };
}

async function showResults(query, filters, view) {
  const currentRequest = ++requestNumber;
  view.feedback.replaceChildren();
  view.count.textContent = 'Loading results…';

  try {
    const result = await query(filters);
    if (currentRequest !== requestNumber) return;
    view.list.replaceChildren(...result.rows.map((row) => node('li', row.name)));
    view.count.textContent = `${result.rows.length} results`;
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    const alert = node('p', error instanceof Error ? error.message : 'Query unavailable');
    alert.setAttribute('role', 'alert');
    view.feedback.replaceChildren(alert);
    view.count.textContent = 'Results unavailable';
  }
}

function renderProducts({ initial = false } = {}) {
  const filters = readProductFilters();
  if (initial) writeFilters(filters, PRODUCT_KEYS, { replace: true, keepEmpty: ['status'] });
  const view = makePage('Products');
  const keyword = input();
  const category = select([
    ['', 'All categories'],
    ['wear', 'Wear'],
    ['food', 'Food'],
    ['home', 'Home'],
  ]);
  const status = select([
    ['published', 'Published'],
    ['draft', 'Draft'],
    ['', 'All publication statuses'],
  ]);
  keyword.value = filters.q;
  category.value = filters.category;
  status.value = filters.status;

  const apply = button('Apply', undefined, 'submit');
  const reset = button('Reset');
  view.form.append(
    field('Product keyword', keyword),
    field('Category', category),
    field('Publication status', status),
    node('div'),
  );
  view.form.lastElementChild.className = 'actions';
  view.form.lastElementChild.append(apply, reset);

  const applyDraft = () => {
    const next = { q: keyword.value, category: category.value, status: status.value };
    writeFilters(next, PRODUCT_KEYS, { keepEmpty: ['status'] });
    showResults(queryProducts, next, view);
  };
  view.form.addEventListener('submit', (event) => {
    event.preventDefault();
    applyDraft();
  });
  reset.addEventListener('click', () => {
    keyword.value = '';
    category.value = '';
    status.value = 'published';
    applyDraft();
  });
  showResults(queryProducts, filters, view);
}

function isCompleteDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function renderOrders({ initial = false } = {}) {
  const filters = readOrderFilters();
  if (initial) writeFilters(filters, ORDER_KEYS, { replace: true });
  const view = makePage('Orders');
  const keyword = input();
  const from = input('date');
  const to = input('date');
  const status = select([
    ['', 'All statuses'],
    ['new', 'New'],
    ['paid', 'Paid'],
  ]);
  keyword.value = filters.q;
  from.value = filters.from;
  to.value = filters.to;
  status.value = filters.status;

  const validation = node('p');
  validation.id = 'order-date-error';
  validation.className = 'field-error';
  validation.hidden = true;
  from.setAttribute('aria-describedby', validation.id);
  to.setAttribute('aria-describedby', validation.id);
  const reset = button('Reset');
  view.form.append(
    field('Order keyword', keyword),
    field('From', from),
    field('To', to),
    field('Order status', status),
    node('div'),
    validation,
  );
  view.form.lastElementChild.previousElementSibling.className = 'actions';
  view.form.lastElementChild.previousElementSibling.append(reset);

  const applyEdit = () => {
    let message = '';
    if (!isCompleteDate(from.value) || !isCompleteDate(to.value)) {
      message = 'Enter a complete date range.';
    } else if (from.value > to.value) {
      message = 'From date must be on or before To date.';
    }
    validation.textContent = message;
    validation.hidden = !message;
    from.setAttribute('aria-invalid', String(Boolean(message)));
    to.setAttribute('aria-invalid', String(Boolean(message)));
    if (message) return;

    const next = { q: keyword.value, from: from.value, to: to.value, status: status.value };
    writeFilters(next, ORDER_KEYS);
    showResults(queryOrders, next, view);
  };
  view.form.addEventListener('submit', (event) => event.preventDefault());
  keyword.addEventListener('input', applyEdit);
  from.addEventListener('input', applyEdit);
  to.addEventListener('input', applyEdit);
  status.addEventListener('change', applyEdit);
  reset.addEventListener('click', () => {
    keyword.value = '';
    from.value = defaultOrderDates.from;
    to.value = defaultOrderDates.to;
    status.value = '';
    applyEdit();
  });
  showResults(queryOrders, filters, view);
}

function renderFromUrl(options) {
  requestNumber += 1;
  if (new URLSearchParams(location.search).get('page') === 'orders') {
    renderOrders(options);
  } else {
    renderProducts(options);
  }
}

addEventListener('popstate', () => renderFromUrl());
renderFromUrl({ initial: true });
