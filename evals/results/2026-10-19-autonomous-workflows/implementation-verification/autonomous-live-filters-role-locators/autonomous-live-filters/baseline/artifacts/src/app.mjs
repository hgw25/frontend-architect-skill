import { node, field, input, select, button } from './ui.mjs';
import { today } from './data.mjs';
import { queryProducts, queryOrders } from './query.mjs';

const app = document.querySelector('#app');
const PRODUCT_CATEGORIES = new Set(['wear', 'food', 'home']);
const PRODUCT_STATUSES = new Set(['published', 'draft']);
const ORDER_STATUSES = new Set(['new', 'paid']);
const FILTER_PARAMETERS = ['q', 'category', 'status', 'from', 'to'];

let requestNumber = 0;

function dateDaysBefore(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const defaultOrderDates = {
  from: dateDaysBefore(today, 29),
  to: today,
};

function currentPage() {
  return new URL(window.location.href).searchParams.get('page') === 'orders'
    ? 'orders'
    : 'products';
}

function productFiltersFromUrl() {
  const params = new URL(window.location.href).searchParams;
  const category = params.get('category') || '';
  const status = params.get('status') || 'published';

  return {
    q: params.get('q') || '',
    category: PRODUCT_CATEGORIES.has(category) ? category : '',
    status: PRODUCT_STATUSES.has(status) ? status : 'published',
  };
}

function orderFiltersFromUrl() {
  const params = new URL(window.location.href).searchParams;
  const status = params.get('status') || '';

  return {
    q: params.get('q') || '',
    from: params.get('from') || defaultOrderDates.from,
    to: params.get('to') || defaultOrderDates.to,
    status: ORDER_STATUSES.has(status) ? status : '',
  };
}

function updateUrl(filters, mode = 'push') {
  const url = new URL(window.location.href);
  for (const parameter of FILTER_PARAMETERS) url.searchParams.delete(parameter);

  for (const [key, value] of Object.entries(filters)) {
    if (value) url.searchParams.set(key, value);
  }

  const method = mode === 'replace' ? 'replaceState' : 'pushState';
  window.history[method](null, '', url);
}

function buildShell(title) {
  const nav = node('nav');
  nav.setAttribute('aria-label', 'Pages');
  for (const [name, page] of [['Products', 'products'], ['Orders', 'orders']]) {
    const link = node('a', name);
    link.href = `/?page=${page}`;
    if (page === currentPage()) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }

  const heading = node('h1', title);
  const resultRegion = node('section');
  resultRegion.className = 'results';
  resultRegion.setAttribute('aria-labelledby', 'result-count');

  const count = node('p', 'Loading results…');
  count.id = 'result-count';
  count.className = 'result-count';
  count.setAttribute('role', 'status');
  count.setAttribute('aria-live', 'polite');

  const error = node('p');
  error.className = 'query-error';
  error.setAttribute('role', 'alert');
  error.hidden = true;

  const list = node('ul');
  list.setAttribute('aria-label', 'Results');
  resultRegion.append(count, error, list);

  app.replaceChildren(nav, heading);
  return { count, error, list, resultRegion };
}

function renderRows(region, rows) {
  region.list.replaceChildren(...rows.map((row) => node('li', row.name)));
  region.count.textContent = `${rows.length} results`;
}

async function loadResults(query, filters, region) {
  const thisRequest = ++requestNumber;
  region.error.hidden = true;

  try {
    const result = await query(filters);
    if (thisRequest !== requestNumber) return;
    renderRows(region, result.rows);
  } catch (error) {
    if (thisRequest !== requestNumber) return;
    region.error.textContent = error instanceof Error ? error.message : 'Query unavailable';
    region.error.hidden = false;
  }
}

function renderProducts() {
  document.title = 'Products';
  const applied = productFiltersFromUrl();
  const region = buildShell('Products');
  const form = node('form');
  form.className = 'filters';

  const keyword = input();
  keyword.name = 'q';
  keyword.value = applied.q;

  const category = select([
    ['', 'All categories'],
    ['wear', 'Wear'],
    ['food', 'Food'],
    ['home', 'Home'],
  ]);
  category.name = 'category';
  category.value = applied.category;

  const status = select([
    ['published', 'Published'],
    ['draft', 'Draft'],
  ]);
  status.name = 'status';
  status.value = applied.status;

  const actions = node('div');
  actions.className = 'filter-actions';
  actions.append(button('Apply', undefined, 'submit'), button('Reset'));
  form.append(
    field('Product keyword', keyword),
    field('Category', category),
    field('Publication status', status),
    actions,
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const filters = { q: keyword.value, category: category.value, status: status.value };
    updateUrl(filters);
    loadResults(queryProducts, filters, region);
  });

  actions.lastElementChild.addEventListener('click', () => {
    keyword.value = '';
    category.value = '';
    status.value = 'published';
    const filters = { q: '', category: '', status: 'published' };
    updateUrl(filters);
    loadResults(queryProducts, filters, region);
  });

  app.append(form, region.resultRegion);
  loadResults(queryProducts, applied, region);
}

function validateOrderDates(from, to) {
  if (!from || !to) return 'Enter both a From and To date.';
  if (from > to) return 'From date must be on or before To date.';
  return '';
}

function renderOrders() {
  document.title = 'Orders';
  const applied = orderFiltersFromUrl();
  const region = buildShell('Orders');
  const form = node('form');
  form.className = 'filters';
  form.addEventListener('submit', (event) => event.preventDefault());

  const keyword = input();
  keyword.name = 'q';
  keyword.value = applied.q;

  const from = input('date');
  from.name = 'from';
  from.value = applied.from;

  const to = input('date');
  to.name = 'to';
  to.value = applied.to;

  const status = select([
    ['', 'All statuses'],
    ['new', 'New'],
    ['paid', 'Paid'],
  ]);
  status.name = 'status';
  status.value = applied.status;

  const dateError = node('p');
  dateError.id = 'date-error';
  dateError.className = 'field-error';
  dateError.hidden = true;
  from.setAttribute('aria-describedby', dateError.id);
  to.setAttribute('aria-describedby', dateError.id);

  const reset = button('Reset');
  const actions = node('div');
  actions.className = 'filter-actions';
  actions.append(reset);

  form.append(
    field('Order keyword', keyword),
    field('From', from),
    field('To', to),
    field('Order status', status),
    dateError,
    actions,
  );

  const applyEdit = () => {
    const message = validateOrderDates(from.value, to.value);
    dateError.textContent = message;
    dateError.hidden = !message;
    from.setAttribute('aria-invalid', String(Boolean(message)));
    to.setAttribute('aria-invalid', String(Boolean(message)));
    if (message) return;

    const filters = {
      q: keyword.value,
      from: from.value,
      to: to.value,
      status: status.value,
    };
    updateUrl(filters);
    loadResults(queryOrders, filters, region);
  };

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

  app.append(form, region.resultRegion);
  const initialError = validateOrderDates(applied.from, applied.to);
  if (initialError) {
    dateError.textContent = initialError;
    dateError.hidden = false;
    from.setAttribute('aria-invalid', 'true');
    to.setAttribute('aria-invalid', 'true');
  } else {
    loadResults(queryOrders, applied, region);
  }
}

function renderPage() {
  requestNumber += 1;
  if (currentPage() === 'orders') renderOrders();
  else renderProducts();
}

window.addEventListener('popstate', renderPage);
renderPage();
