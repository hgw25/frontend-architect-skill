export const supportedLocales = ['en-US', 'fr-FR'] as const

export type SupportedLocale = (typeof supportedLocales)[number]

type MessageKey =
  | 'error'
  | 'language'
  | 'productSearch'
  | 'search'
  | 'searching'

const translations: Record<SupportedLocale, Record<MessageKey, string>> = {
  'en-US': {
    error: 'Search failed',
    language: 'Language',
    productSearch: 'Product search',
    search: 'Search',
    searching: 'Searching…',
  },
  'fr-FR': {
    error: 'La recherche a échoué',
    language: 'Langue',
    productSearch: 'Recherche de produits',
    search: 'Rechercher',
    searching: 'Recherche en cours…',
  },
}

const resultCountMessages: Record<
  SupportedLocale,
  Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }
> = {
  'en-US': {
    one: '{count} result',
    other: '{count} results',
  },
  'fr-FR': {
    one: '{count} résultat',
    other: '{count} résultats',
  },
}

const currencies: Record<SupportedLocale, string> = {
  'en-US': 'USD',
  'fr-FR': 'EUR',
}

export function isSupportedLocale(value: string | null): value is SupportedLocale {
  return supportedLocales.some((locale) => locale === value)
}

export function message(locale: SupportedLocale, key: MessageKey): string {
  return translations[locale][key]
}

export function formatResultCount(locale: SupportedLocale, count: number): string {
  const pluralCategory = new Intl.PluralRules(locale).select(count)
  const template =
    resultCountMessages[locale][pluralCategory] ??
    resultCountMessages[locale].other
  const formattedCount = new Intl.NumberFormat(locale).format(count)

  return template.replace('{count}', formattedCount)
}

export function formatPrice(locale: SupportedLocale, price: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencies[locale],
  }).format(price)
}
