export function formatCount(count, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { notation: 'compact' }).format(count);
}
export function formatDate(value, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}
