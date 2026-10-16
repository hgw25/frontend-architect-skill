<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  createSearchPageFormatter,
  isSupportedLocale,
  languageOptions,
  type MessageKey,
  type SupportedLocale,
} from './searchPageI18n'
import { readSearchState, searchStateUrl, type SearchState } from './searchUrlState'

type SearchResult = {
  id: string
  name: string
  price: number
}

const initialState = readSearchState()
const draftQuery = ref(initialState.query)
const searchState = ref<SearchState>(initialState)
const results = ref<SearchResult[]>([])
const total = ref(0)
const error = ref<MessageKey | null>(null)
const loading = ref(false)

const i18n = computed(() => createSearchPageFormatter(searchState.value.locale))

let activeRequest = 0
let activeController: AbortController | null = null

function applyDocumentLanguage(locale: SupportedLocale) {
  document.documentElement.lang = locale
}

async function search(state: SearchState) {
  const requestId = ++activeRequest
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller

  error.value = null
  loading.value = true
  results.value = []
  total.value = 0

  try {
    const params = new URLSearchParams({ q: state.query, page: String(state.page) })
    const response = await fetch(`/api/search?${params.toString()}`, {
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`Search request failed with status ${response.status}`)

    const payload = (await response.json()) as {
      items: SearchResult[]
      total: number
    }

    if (requestId !== activeRequest) return

    results.value = payload.items
    total.value = payload.total
  } catch {
    if (requestId !== activeRequest || controller.signal.aborted) return

    error.value = 'searchError'
  } finally {
    if (requestId === activeRequest) {
      loading.value = false
      activeController = null
    }
  }
}

function setSearchState(nextState: SearchState, addHistoryEntry: boolean) {
  const previousState = searchState.value
  searchState.value = nextState
  applyDocumentLanguage(nextState.locale)

  if (addHistoryEntry) {
    window.history.pushState(null, '', searchStateUrl(nextState))
  }

  if (previousState.query !== nextState.query || previousState.page !== nextState.page) {
    void search(nextState)
  }
}

function submitSearch() {
  const nextState: SearchState = {
    query: draftQuery.value,
    page: 1,
    locale: searchState.value.locale,
  }

  window.history.pushState(null, '', searchStateUrl(nextState))
  searchState.value = nextState
  applyDocumentLanguage(nextState.locale)
  void search(nextState)
}

function changeLocale(event: Event) {
  const locale = (event.currentTarget as HTMLSelectElement).value
  if (!isSupportedLocale(locale) || locale === searchState.value.locale) return

  setSearchState({ ...searchState.value, locale }, true)
}

function changePage(page: number) {
  if (page < 1 || page === searchState.value.page) return

  setSearchState({ ...searchState.value, page }, true)
}

function restoreSearchState() {
  const nextState = readSearchState()
  draftQuery.value = nextState.query
  setSearchState(nextState, false)
}

onMounted(() => {
  applyDocumentLanguage(searchState.value.locale)
  window.addEventListener('popstate', restoreSearchState)
  void search(searchState.value)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', restoreSearchState)
  activeRequest += 1
  activeController?.abort()
})
</script>

<template>
  <main>
    <h1>{{ i18n.message('title') }}</h1>

    <label>
      {{ i18n.message('localeLabel') }}
      <select name="locale" :value="searchState.locale" @change="changeLocale">
        <option v-for="option in languageOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </label>

    <form @submit.prevent="submitSearch">
      <label>
        {{ i18n.message('searchLabel') }}
        <input v-model="draftQuery" name="query" type="search" />
      </label>
      <button type="submit">{{ i18n.message('searchButton') }}</button>
    </form>

    <p v-if="error" role="alert">{{ i18n.message(error) }}</p>
    <p v-if="loading" role="status">{{ i18n.message('loading') }}</p>
    <p v-else aria-live="polite">{{ i18n.resultCount(total) }}</p>

    <ul>
      <li v-for="result in results" :key="result.id">
        <span>{{ result.name }}</span>
        <span> — {{ i18n.price(result.price) }}</span>
      </li>
    </ul>

    <nav :aria-label="i18n.pageNumber(searchState.page)">
      <button
        type="button"
        :disabled="searchState.page === 1"
        @click="changePage(searchState.page - 1)"
      >
        {{ i18n.message('previousPage') }}
      </button>
      <span>{{ i18n.pageNumber(searchState.page) }}</span>
      <button type="button" @click="changePage(searchState.page + 1)">
        {{ i18n.message('nextPage') }}
      </button>
    </nav>
  </main>
</template>
