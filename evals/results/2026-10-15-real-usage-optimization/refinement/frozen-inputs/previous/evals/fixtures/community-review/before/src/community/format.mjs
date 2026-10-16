export function formatCount(count, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { notation: 'compact' }).format(count);
}
