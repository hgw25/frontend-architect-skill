<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  formatPrice,
  formatResultCount,
  isSupportedLocale,
  message,
  supportedLocales,
  type SupportedLocale,
} from './searchPageI18n'

type SearchResult = {
  id: string
  name: string
  price: number
}

type SearchState = {
  query: string
  page: number
  locale: SupportedLocale
}

function readSearchState(): SearchState {
  const parameters = new URLSearchParams(window.location.search)
  const pageParameter = parameters.get('page')
  const parsedPage = pageParameter === null ? 1 : Number(pageParameter)
  const localeParameter = parameters.get('locale')

  return {
    query: parameters.get('q') ?? '',
    page:
      Number.isSafeInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1,
    locale: isSupportedLocale(localeParameter) ? localeParameter : 'en-US',
  }
}

function writeSearchState(state: SearchState): void {
  const url = new URL(window.location.href)
  url.searchParams.set('q', state.query)
  url.searchParams.set('page', String(state.page))
  url.searchParams.set('locale', state.locale)
  window.history.pushState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  )
}

const initialState = readSearchState()
const query = ref(initialState.query)
const submittedQuery = ref(initialState.query)
const page = ref(initialState.page)
const locale = ref<SupportedLocale>(initialState.locale)
const results = ref<SearchResult[]>([])
const total = ref(0)
const error = ref('')
const loading = ref(false)
const resultCount = computed(() => formatResultCount(locale.value, total.value))

let requestVersion = 0
let activeController: AbortController | undefined
const originalDocumentLanguage = document.documentElement.lang

watch(
  locale,
  (value) => {
    document.documentElement.lang = value
  },
  { immediate: true },
)

function currentSearchState(): SearchState {
  return {
    query: submittedQuery.value,
    page: page.value,
    locale: locale.value,
  }
}

async function search(state: SearchState) {
  const version = ++requestVersion
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller

  error.value = ''
  loading.value = true

  try {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(state.query)}&page=${state.page}`,
      { signal: controller.signal },
    )

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`)
    }

    const payload = (await response.json()) as {
      items: SearchResult[]
      total: number
    }

    if (version !== requestVersion) return

    results.value = payload.items
    total.value = payload.total
  } catch {
    if (version !== requestVersion) return

    error.value = message(state.locale, 'error')
  } finally {
    if (version === requestVersion) {
      loading.value = false
      activeController = undefined
    }
  }
}

function submitSearch(): void {
  submittedQuery.value = query.value
  page.value = 1
  const state = currentSearchState()

  writeSearchState(state)
  void search(state)
}

function changeLocale(): void {
  const state = currentSearchState()

  writeSearchState(state)
  void search(state)
}

function restoreSearchFromUrl(): void {
  const state = readSearchState()
  query.value = state.query
  submittedQuery.value = state.query
  page.value = state.page
  locale.value = state.locale
  void search(state)
}

onMounted(() => {
  window.addEventListener('popstate', restoreSearchFromUrl)
  void search(currentSearchState())
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', restoreSearchFromUrl)
  requestVersion += 1
  activeController?.abort()

  if (document.documentElement.lang === locale.value) {
    document.documentElement.lang = originalDocumentLanguage
  }
})
</script>

<template>
  <main :lang="locale" :aria-busy="loading">
    <h1>{{ message(locale, 'productSearch') }}</h1>
    <label>
      {{ message(locale, 'language') }}
      <select v-model="locale" name="locale" @change="changeLocale">
        <option
          v-for="supportedLocale in supportedLocales"
          :key="supportedLocale"
          :value="supportedLocale"
        >
          {{ supportedLocale }}
        </option>
      </select>
    </label>

    <form @submit.prevent="submitSearch">
      <label>
        {{ message(locale, 'search') }}
        <input v-model="query" name="query" />
      </label>
      <button type="submit">
        {{ message(locale, loading ? 'searching' : 'search') }}
      </button>
    </form>

    <p v-if="error" role="alert">{{ error }}</p>
    <p aria-live="polite">{{ resultCount }}</p>
    <ul>
      <li v-for="result in results" :key="result.id">
        {{ result.name }} — {{ formatPrice(locale, result.price) }}
      </li>
    </ul>
  </main>
</template>
