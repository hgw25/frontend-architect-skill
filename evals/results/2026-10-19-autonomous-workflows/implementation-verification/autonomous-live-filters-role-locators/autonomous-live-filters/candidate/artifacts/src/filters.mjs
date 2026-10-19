import { today } from './data.mjs';

const PRODUCT_CATEGORIES = new Set(['', 'wear', 'food', 'home']);
const PRODUCT_STATUSES = new Set(['', 'published', 'draft']);
const ORDER_STATUSES = new Set(['', 'new', 'paid']);

export function defaultProductFilters() {
  return { q: '', category: '', status: 'published' };
}

export function defaultOrderFilters() {
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);

  return {
    q: '',
    status: '',
    from: start.toISOString().slice(0, 10),
    to: today,
  };
}

export function productFiltersFromUrl(url) {
  const defaults = defaultProductFilters();
  const category = url.searchParams.get('p_category') ?? defaults.category;
  const status = url.searchParams.has('p_status')
    ? url.searchParams.get('p_status')
    : defaults.status;

  return {
    q: url.searchParams.get('p_q') ?? defaults.q,
    category: PRODUCT_CATEGORIES.has(category) ? category : defaults.category,
    status: PRODUCT_STATUSES.has(status) ? status : defaults.status,
  };
}

export function orderDraftFromUrl(url) {
  const defaults = defaultOrderFilters();
  const status = url.searchParams.get('o_status') ?? defaults.status;

  return {
    q: url.searchParams.get('o_q') ?? defaults.q,
    status: ORDER_STATUSES.has(status) ? status : defaults.status,
    from: url.searchParams.get('o_from') ?? defaults.from,
    to: url.searchParams.get('o_to') ?? defaults.to,
  };
}

function updateParam(url, key, value, defaultValue) {
  if (value === defaultValue) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
}

export function urlWithProductFilters(currentUrl, filters) {
  const url = new URL(currentUrl);
  const defaults = defaultProductFilters();
  updateParam(url, 'p_q', filters.q, defaults.q);
  updateParam(url, 'p_category', filters.category, defaults.category);
  updateParam(url, 'p_status', filters.status, defaults.status);
  return url;
}

export function urlWithOrderFilters(currentUrl, filters) {
  const url = new URL(currentUrl);
  const defaults = defaultOrderFilters();
  updateParam(url, 'o_q', filters.q, defaults.q);
  updateParam(url, 'o_status', filters.status, defaults.status);
  updateParam(url, 'o_from', filters.from, defaults.from);
  updateParam(url, 'o_to', filters.to, defaults.to);
  return url;
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateOrderFilters(filters) {
  if (!isCalendarDate(filters.from) || !isCalendarDate(filters.to)) {
    return 'Enter both dates to apply the date range.';
  }
  if (filters.from > filters.to) {
    return 'The From date must be before or the same as the To date.';
  }
  return null;
}
