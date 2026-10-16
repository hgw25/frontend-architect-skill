export const supportedLocales = ['en-US', 'fr-FR'] as const

export type SupportedLocale = (typeof supportedLocales)[number]

export type SearchState = {
  query: string
  page: number
  locale: SupportedLocale
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.some((locale) => locale === value)
}

export function readSearchState(url: URL): SearchState {
  const page = Number(url.searchParams.get('page'))
  const locale = url.searchParams.get('locale') ?? ''

  return {
    query: url.searchParams.get('q') ?? '',
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
    locale: isSupportedLocale(locale) ? locale : 'en-US',
  }
}

export function createSearchUrl(currentUrl: URL, state: SearchState): string {
  const url = new URL(currentUrl)
  url.searchParams.set('q', state.query)
  url.searchParams.set('page', String(state.page))
  url.searchParams.set('locale', state.locale)

  return `${url.pathname}${url.search}${url.hash}`
}
