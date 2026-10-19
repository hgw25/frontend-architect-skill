import { today } from './data.mjs';

export const PRODUCT_KEYS = ['p_q', 'p_category', 'p_status', 'p_stock'];
export const ORDER_KEYS = ['o_q', 'o_from', 'o_to', 'o_status'];
export const ALL_FILTER_KEYS = [...PRODUCT_KEYS, ...ORDER_KEYS];

const PRODUCT_CATEGORIES = new Set(['wear', 'food', 'home']);
const PRODUCT_STATUSES = new Set(['', 'published', 'draft']);
const PRODUCT_STOCK = new Set(['', 'in', 'out']);
const ORDER_STATUSES = new Set(['', 'new', 'paid']);

export const productDefaults = Object.freeze({
  q: '',
  category: '',
  status: 'published',
  stock: '',
});
export const orderDefaults = Object.freeze({
  q: '',
  from: addUtcDays(today, -29),
  to: today,
  status: '',
});

export function parseProductFilters(params) {
  const category = params.get('p_category') ?? productDefaults.category;
  const status = params.has('p_status') ? params.get('p_status') : productDefaults.status;
  const stock = params.get('p_stock') ?? productDefaults.stock;
  return {
    q: params.get('p_q') ?? productDefaults.q,
    category: PRODUCT_CATEGORIES.has(category) ? category : productDefaults.category,
    status: PRODUCT_STATUSES.has(status) ? status : productDefaults.status,
    stock: PRODUCT_STOCK.has(stock) ? stock : productDefaults.stock,
  };
}

export function serializeProductFilters(filters) {
  return new Map([
    ['p_q', filters.q || null],
    ['p_category', filters.category || null],
    ['p_status', filters.status === productDefaults.status ? null : filters.status],
    ['p_stock', filters.stock || null],
  ]);
}

export function parseOrderFilters(params) {
  const from = params.get('o_from');
  const to = params.get('o_to');
  const status = params.get('o_status') ?? orderDefaults.status;
  const rangeIsValid = !validateDateRange(from, to);
  return {
    q: params.get('o_q') ?? orderDefaults.q,
    from: rangeIsValid ? from : orderDefaults.from,
    to: rangeIsValid ? to : orderDefaults.to,
    status: ORDER_STATUSES.has(status) ? status : orderDefaults.status,
  };
}

export function serializeOrderFilters(filters) {
  return new Map([
    ['o_q', filters.q || null],
    ['o_from', filters.from === orderDefaults.from ? null : filters.from],
    ['o_to', filters.to === orderDefaults.to ? null : filters.to],
    ['o_status', filters.status || null],
  ]);
}

export function validateDateRange(from, to) {
  if (!isIsoDate(from) || !isIsoDate(to)) return 'Enter a complete valid date range.';
  if (from > to) return 'From date must be before or equal to To date.';
  return '';
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function addUtcDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
