import { node, field, input, select, button } from './ui.mjs';
import { queryProducts, queryOrders } from './query.mjs';
import { createLatestQueryRunner } from './latest-query.mjs';
import {
  PRODUCT_KEYS,
  ORDER_KEYS,
  ALL_FILTER_KEYS,
  productDefaults,
  orderDefaults,
  parseProductFilters,
  serializeProductFilters,
  parseOrderFilters,
  serializeOrderFilters,
  validateDateRange,
} from './filter-state.mjs';

const app = document.querySelector('#app');
let restorePageFromUrl = () => {};

renderApp();
window.addEventListener('popstate', () => restorePageFromUrl());

function renderApp() {
  const page = new URL(location.href).searchParams.get('page') === 'orders' ? 'orders' : 'products';
  const nav = node('nav');
  nav.setAttribute('aria-label', 'Pages');

  for (const [name, target] of [['Products', 'products'], ['Orders', 'orders']]) {
    const link = node('a', name);
    link.href = pageHref(target);
    if (target === page) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }

  const pageRoot = node('section');
  app.replaceChildren(nav, pageRoot);
  restorePageFromUrl = page === 'orders'
    ? setupOrdersPage(pageRoot)
    : setupProductsPage(pageRoot);
  restorePageFromUrl();
}

function setupProductsPage(root) {
  const heading = node('h1', 'Products');
  const form = node('form');
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
    ['', 'All statuses'],
  ]);
  const stock = select([
    ['', 'All'],
    ['in', 'In stock'],
    ['out', 'Out of stock'],
  ]);
  const results = createResultsView();
  const runQuery = createLatestQueryRunner(queryProducts, results);

  form.append(
    field('Product keyword', keyword),
    field('Product category', category),
    field('Product status', status),
    field('Product stock', stock),
    button('Apply', undefined, 'submit'),
    button('Reset', () => {
      setProductDraft(productDefaults);
      applyProductDraft();
    }),
  );
  form.addEventListener('submit', event => {
    event.preventDefault();
    applyProductDraft();
  });

  root.append(heading, form, results.element);

  function setProductDraft(filters) {
    keyword.value = filters.q;
    category.value = filters.category;
    status.value = filters.status;
    stock.value = filters.stock;
  }

  function readProductDraft() {
    return {
      q: keyword.value,
      category: category.value,
      status: status.value,
      stock: stock.value,
    };
  }

  function applyProductDraft() {
    const filters = readProductDraft();
    pushFilters(PRODUCT_KEYS, serializeProductFilters(filters));
    runQuery(filters);
  }

  return () => {
    const filters = parseProductFilters(new URL(location.href).searchParams);
    setProductDraft(filters);
    runQuery(filters);
  };
}

function setupOrdersPage(root) {
  const heading = node('h1', 'Orders');
  const form = node('form');
  const keyword = input();
  const from = input('date');
  const to = input('date');
  const status = select([
    ['', 'All statuses'],
    ['new', 'New'],
    ['paid', 'Paid'],
  ]);
  const dateError = node('p');
  dateError.id = 'order-date-error';
  dateError.className = 'field-error';
  dateError.setAttribute('role', 'alert');
  dateError.hidden = true;
  const results = createResultsView();
  const runQuery = createLatestQueryRunner(queryOrders, results);

  from.setAttribute('aria-describedby', dateError.id);
  to.setAttribute('aria-describedby', dateError.id);
  form.append(
    field('Order keyword', keyword),
    field('From date', from),
    field('To date', to),
    field('Order status', status),
    button('Reset', () => {
      setOrderDraft(orderDefaults);
      publishOrderDraft();
    }),
    dateError,
  );
  form.addEventListener('submit', event => event.preventDefault());
  keyword.addEventListener('input', publishOrderDraft);
  from.addEventListener('input', publishOrderDraft);
  to.addEventListener('input', publishOrderDraft);
  status.addEventListener('change', publishOrderDraft);

  root.append(heading, form, results.element);

  function setOrderDraft(filters) {
    keyword.value = filters.q;
    from.value = filters.from;
    to.value = filters.to;
    status.value = filters.status;
    showDateError('');
  }

  function readOrderDraft() {
    return { q: keyword.value, from: from.value, to: to.value, status: status.value };
  }

  function publishOrderDraft() {
    const filters = readOrderDraft();
    const error = validateDateRange(filters.from, filters.to);
    showDateError(error);
    if (error) return;

    pushFilters(ORDER_KEYS, serializeOrderFilters(filters));
    runQuery(filters);
  }

  function showDateError(message) {
    dateError.textContent = message;
    dateError.hidden = !message;
    from.setAttribute('aria-invalid', String(Boolean(message)));
    to.setAttribute('aria-invalid', String(Boolean(message)));
  }

  return () => {
    const filters = parseOrderFilters(new URL(location.href).searchParams);
    setOrderDraft(filters);
    runQuery(filters);
  };
}

function createResultsView() {
  const element = node('section');
  element.className = 'results';
  const count = node('p', 'Loading results…');
  count.setAttribute('role', 'status');
  const error = node('p');
  error.className = 'query-error';
  error.setAttribute('role', 'alert');
  error.hidden = true;
  const list = node('ul');
  list.setAttribute('aria-label', 'Results');
  element.append(count, error, list);

  return {
    element,
    start() {
      list.setAttribute('aria-busy', 'true');
      error.hidden = true;
      error.textContent = '';
    },
    succeed(result) {
      list.replaceChildren(...result.rows.map(row => node('li', row.name)));
      count.textContent = `${result.count} results`;
      error.hidden = true;
      error.textContent = '';
    },
    fail(reason) {
      error.textContent = reason instanceof Error ? reason.message : 'Query failed';
      error.hidden = false;
    },
    finish() {
      list.removeAttribute('aria-busy');
    },
  };
}

function pushFilters(ownedKeys, values) {
  const url = new URL(location.href);
  for (const key of ownedKeys) url.searchParams.delete(key);
  for (const [key, value] of values) {
    if (value !== null) url.searchParams.set(key, value);
  }
  history.pushState(null, '', url);
}

function pageHref(page) {
  const url = new URL(location.href);
  url.searchParams.set('page', page);
  for (const key of ALL_FILTER_KEYS) url.searchParams.delete(key);
  return `${url.pathname}?${url.searchParams}`;
}
