import { isSupportedLocale, type SupportedLocale } from './searchPageI18n'

export type SearchState = {
  query: string
  page: number
  locale: SupportedLocale
}

function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 1

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

export function readSearchState(): SearchState {
  const params = new URLSearchParams(window.location.search)
  const locale = params.get('locale')

  return {
    query: params.get('q') ?? '',
    page: parsePage(params.get('page')),
    locale: isSupportedLocale(locale) ? locale : 'en-US',
  }
}

export function searchStateUrl(state: SearchState): string {
  const params = new URLSearchParams({
    q: state.query,
    page: String(state.page),
    locale: state.locale,
  })

  return `${window.location.pathname}?${params.toString()}${window.location.hash}`
}
