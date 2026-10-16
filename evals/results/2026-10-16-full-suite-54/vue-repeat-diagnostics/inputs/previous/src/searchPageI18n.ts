export const supportedLocales = ['en-US', 'fr-FR'] as const
export type SupportedLocale = (typeof supportedLocales)[number]

export type MessageKey =
  | 'title'
  | 'searchLabel'
  | 'searchButton'
  | 'localeLabel'
  | 'previousPage'
  | 'nextPage'
  | 'loading'
  | 'searchError'

type Messages = Record<MessageKey, string> & {
  resultCount: { one: string; other: string }
  pageNumber: string
}

type LocaleConfig = {
  displayName: string
  currency: string
  messages: Messages
}

const localeConfig = {
  'en-US': {
    displayName: 'English (United States)',
    currency: 'USD',
    messages: {
      title: 'Product search',
      searchLabel: 'Search',
      searchButton: 'Search',
      localeLabel: 'Language',
      previousPage: 'Previous page',
      nextPage: 'Next page',
      loading: 'Searching…',
      searchError: 'Search failed',
      resultCount: {
        one: '{count} result',
        other: '{count} results',
      },
      pageNumber: 'Page {page}',
    },
  },
  'fr-FR': {
    displayName: 'Français (France)',
    currency: 'EUR',
    messages: {
      title: 'Recherche de produits',
      searchLabel: 'Rechercher',
      searchButton: 'Rechercher',
      localeLabel: 'Langue',
      previousPage: 'Page précédente',
      nextPage: 'Page suivante',
      loading: 'Recherche en cours…',
      searchError: 'La recherche a échoué',
      resultCount: {
        one: '{count} résultat',
        other: '{count} résultats',
      },
      pageNumber: 'Page {page}',
    },
  },
} satisfies Record<SupportedLocale, LocaleConfig>

export const languageOptions = supportedLocales.map((value) => ({
  value,
  label: localeConfig[value].displayName,
}))

export function isSupportedLocale(value: string | null): value is SupportedLocale {
  return supportedLocales.some((locale) => locale === value)
}

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] ?? placeholder)
}

export function createSearchPageFormatter(locale: SupportedLocale) {
  const config = localeConfig[locale]
  const numberFormatter = new Intl.NumberFormat(locale)
  const pluralRules = new Intl.PluralRules(locale)
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: config.currency,
  })

  return {
    message(key: MessageKey) {
      return config.messages[key]
    },
    resultCount(count: number) {
      const category = pluralRules.select(count)
      const template = category === 'one'
        ? config.messages.resultCount.one
        : config.messages.resultCount.other

      return interpolate(template, { count: numberFormatter.format(count) })
    },
    pageNumber(page: number) {
      return interpolate(config.messages.pageNumber, { page: numberFormatter.format(page) })
    },
    price(value: number) {
      return currencyFormatter.format(value)
    },
  }
}
