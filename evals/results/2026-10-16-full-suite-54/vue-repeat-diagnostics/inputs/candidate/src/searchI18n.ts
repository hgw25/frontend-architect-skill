import type { SupportedLocale } from './searchState'

type PluralMessage = Record<Intl.LDMLPluralRule, string>

const messages = {
  'en-US': {
    heading: 'Product search',
    searchLabel: 'Search',
    searchButton: 'Search',
    localeLabel: 'Language',
    loading: 'Searching…',
    error: 'Search failed. Please try again.',
    previousPage: 'Previous',
    nextPage: 'Next',
    pagination: 'Pagination',
    page: 'Page {page}',
    resultCount: {
      one: '{count} result',
      other: '{count} results',
    },
    currency: 'USD',
  },
  'fr-FR': {
    heading: 'Recherche de produits',
    searchLabel: 'Rechercher',
    searchButton: 'Rechercher',
    localeLabel: 'Langue',
    loading: 'Recherche…',
    error: 'La recherche a échoué. Veuillez réessayer.',
    previousPage: 'Précédent',
    nextPage: 'Suivant',
    pagination: 'Pagination',
    page: 'Page {page}',
    resultCount: {
      one: '{count} résultat',
      other: '{count} résultats',
    },
    currency: 'EUR',
  },
} satisfies Record<
  SupportedLocale,
  {
    heading: string
    searchLabel: string
    searchButton: string
    localeLabel: string
    loading: string
    error: string
    previousPage: string
    nextPage: string
    pagination: string
    page: string
    resultCount: Pick<PluralMessage, 'one' | 'other'>
    currency: string
  }
>

export function createMessages(locale: SupportedLocale) {
  const current = messages[locale]
  const numberFormat = new Intl.NumberFormat(locale)
  const currencyFormat = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: current.currency,
  })
  const pluralRules = new Intl.PluralRules(locale)

  return {
    ...current,
    formatCurrency(value: number) {
      return currencyFormat.format(value)
    },
    formatPage(page: number) {
      return current.page.replace('{page}', numberFormat.format(page))
    },
    formatResultCount(count: number) {
      const plural = pluralRules.select(count)
      const template = current.resultCount[plural === 'one' ? 'one' : 'other']
      return template.replace('{count}', numberFormat.format(count))
    },
  }
}
