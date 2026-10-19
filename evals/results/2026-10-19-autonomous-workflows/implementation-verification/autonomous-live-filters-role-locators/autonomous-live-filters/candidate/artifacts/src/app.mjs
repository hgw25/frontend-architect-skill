import { node, field, input, select, button } from './ui.mjs';
import { queryProducts, queryOrders } from './query.mjs';
import {
  defaultProductFilters,
  defaultOrderFilters,
  productFiltersFromUrl,
  orderDraftFromUrl,
  urlWithProductFilters,
  urlWithOrderFilters,
  validateOrderFilters,
} from './filters.mjs';

const app = document.querySelector('#app');
let requestGeneration = 0;

function currentUrl() {
  return new URL(window.location.href);
}

function createNavigation() {
  const nav = node('nav');
  nav.setAttribute('aria-label', 'Pages');
  for (const [name, page] of [['Products', 'products'], ['Orders', 'orders']]) {
    const link = node('a', name);
    link.href = `/?page=${page}`;
    nav.append(link);
  }
  return nav;
}

function createResults(query) {
  const message = node('p');
  message.className = 'filter-message';
  message.setAttribute('role', 'alert');

  const count = node('p', 'Loading results');
  count.setAttribute('role', 'status');

  const list = node('ul');
  list.setAttribute('aria-label', 'Results');

  function setMessage(text = '') {
    message.textContent = text;
  }

  async function run(filters) {
    const generation = ++requestGeneration;
    setMessage();

    try {
      const result = await query({ ...filters });
      if (generation !== requestGeneration) return;

      list.replaceChildren(...result.rows.map(row => node('li', row.name)));
      count.textContent = `${result.count} ${result.count === 1 ? 'result' : 'results'}`;
    } catch (error) {
      if (generation !== requestGeneration) return;
      setMessage(error instanceof Error ? error.message : 'The query failed.');
    }
  }

  return { message, count, list, run, setMessage };
}

function createProductPage(url) {
  const filters = productFiltersFromUrl(url);
  const form = node('form');
  const keyword = input();
  const category = select([
    ['', 'All categories'],
    ['wear', 'Wear'],
    ['food', 'Food'],
    ['home', 'Home'],
  ]);
  const status = select([
    ['', 'All statuses'],
    ['published', 'Published'],
    ['draft', 'Draft'],
  ]);
  const results = createResults(queryProducts);

  keyword.value = filters.q;
  category.value = filters.category;
  status.value = filters.status;

  function readDraft() {
    return { q: keyword.value, category: category.value, status: status.value };
  }

  function apply(draft) {
    const nextUrl = urlWithProductFilters(currentUrl(), draft);
    history.pushState(null, '', nextUrl);
    results.run(draft);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    apply(readDraft());
  });

  form.append(
    field('Product keyword', keyword),
    field('Product category', category),
    field('Product status', status),
    button('Apply', undefined, 'submit'),
    button('Reset', () => {
      const defaults = defaultProductFilters();
      keyword.value = defaults.q;
      category.value = defaults.category;
      status.value = defaults.status;
      apply(defaults);
    }),
  );

  results.run(filters);
  return [node('h1', 'Products'), form, results.message, results.count, results.list];
}

function createOrderPage(url) {
  const draft = orderDraftFromUrl(url);
  const form = node('form');
  const keyword = input();
  const status = select([
    ['', 'All statuses'],
    ['new', 'New'],
    ['paid', 'Paid'],
  ]);
  const from = input('date');
  const to = input('date');
  const results = createResults(queryOrders);
  const errorId = 'order-filter-error';

  results.message.id = errorId;
  keyword.value = draft.q;
  status.value = draft.status;
  from.value = draft.from;
  to.value = draft.to;
  from.setAttribute('aria-describedby', errorId);
  to.setAttribute('aria-describedby', errorId);

  function readDraft() {
    return { q: keyword.value, status: status.value, from: from.value, to: to.value };
  }

  function applyValidDraft() {
    const next = readDraft();
    const validationMessage = validateOrderFilters(next);
    if (validationMessage) {
      from.setAttribute('aria-invalid', 'true');
      to.setAttribute('aria-invalid', 'true');
      results.setMessage(validationMessage);
      return;
    }

    from.removeAttribute('aria-invalid');
    to.removeAttribute('aria-invalid');
    history.replaceState(null, '', urlWithOrderFilters(currentUrl(), next));
    results.run(next);
  }

  keyword.addEventListener('input', applyValidDraft);
  status.addEventListener('change', applyValidDraft);
  from.addEventListener('input', applyValidDraft);
  to.addEventListener('input', applyValidDraft);
  form.addEventListener('submit', event => event.preventDefault());

  form.append(
    field('Order keyword', keyword),
    field('Order status', status),
    field('From date', from),
    field('To date', to),
    button('Reset', () => {
      const defaults = defaultOrderFilters();
      keyword.value = defaults.q;
      status.value = defaults.status;
      from.value = defaults.from;
      to.value = defaults.to;
      applyValidDraft();
    }),
  );

  const validationMessage = validateOrderFilters(draft);
  if (validationMessage) {
    from.setAttribute('aria-invalid', 'true');
    to.setAttribute('aria-invalid', 'true');
    results.setMessage(validationMessage);
    results.count.textContent = 'Results unavailable';
  } else {
    results.run(draft);
  }

  return [node('h1', 'Orders'), form, results.message, results.count, results.list];
}

function renderFromUrl() {
  ++requestGeneration;
  const url = currentUrl();
  const page = url.searchParams.get('page') === 'orders' ? 'orders' : 'products';
  document.title = page === 'orders' ? 'Orders' : 'Products';
  app.replaceChildren(
    createNavigation(),
    ...(page === 'orders' ? createOrderPage(url) : createProductPage(url)),
  );
}

window.addEventListener('popstate', renderFromUrl);
renderFromUrl();
