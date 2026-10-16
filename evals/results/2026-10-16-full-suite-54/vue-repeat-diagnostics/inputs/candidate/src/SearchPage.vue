<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import { createMessages } from './searchI18n'
import {
  createSearchUrl,
  isSupportedLocale,
  readSearchState,
  supportedLocales,
  type SearchState,
} from './searchState'

type SearchResult = {
  id: string
  name: string
  price: number
}

const initialState = readSearchState(new URL(window.location.href))
const searchState = reactive<SearchState>({ ...initialState })
const draftQuery = ref(initialState.query)
const results = ref<SearchResult[]>([])
const total = ref(0)
const error = ref('')
const loading = ref(false)
const i18n = computed(() => createMessages(searchState.locale))

let activeController: AbortController | undefined
let activeRequest = 0
let previousDocumentLanguage: string | null = null

function applyState(nextState: SearchState) {
  Object.assign(searchState, nextState)
}

function writeUrl(state: SearchState, mode: 'push' | 'replace') {
  const url = createSearchUrl(new URL(window.location.href), state)
  if (mode === 'push') {
    window.history.pushState(null, '', url)
  } else {
    window.history.replaceState(null, '', url)
  }
}

function publishState(state: SearchState, mode: 'push' | 'replace') {
  applyState(state)
  writeUrl(state, mode)
  document.documentElement.lang = state.locale
  void search(state)
}

async function search(state: SearchState) {
  const request = ++activeRequest
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
    if (!response.ok) throw new Error(`Search request failed: ${response.status}`)

    const payload = (await response.json()) as {
      items: SearchResult[]
      total: number
    }

    if (request !== activeRequest) return
    results.value = payload.items
    total.value = payload.total
  } catch {
    if (request !== activeRequest || controller.signal.aborted) return
    error.value = i18n.value.error
  } finally {
    if (request === activeRequest) {
      loading.value = false
      activeController = undefined
    }
  }
}

function submitSearch() {
  publishState(
    { ...searchState, query: draftQuery.value, page: 1 },
    'push',
  )
}

function changeLocale(event: Event) {
  const locale = (event.currentTarget as HTMLSelectElement).value
  if (!isSupportedLocale(locale) || locale === searchState.locale) return
  publishState({ ...searchState, locale }, 'push')
}

function goToPage(page: number) {
  if (page < 1 || page === searchState.page) return
  publishState({ ...searchState, page }, 'push')
}

function restoreFromUrl() {
  const state = readSearchState(new URL(window.location.href))
  applyState(state)
  draftQuery.value = state.query
  writeUrl(state, 'replace')
  document.documentElement.lang = state.locale
  void search(state)
}

onMounted(() => {
  previousDocumentLanguage = document.documentElement.getAttribute('lang')
  window.addEventListener('popstate', restoreFromUrl)
  restoreFromUrl()
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', restoreFromUrl)
  activeRequest += 1
  activeController?.abort()
  if (previousDocumentLanguage === null) {
    document.documentElement.removeAttribute('lang')
  } else {
    document.documentElement.lang = previousDocumentLanguage
  }
})
</script>

<template>
  <main :lang="searchState.locale">
    <h1>{{ i18n.heading }}</h1>
    <form @submit.prevent="submitSearch">
      <label>
        {{ i18n.searchLabel }}
        <input v-model="draftQuery" name="query" type="search" />
      </label>
      <button type="submit">{{ i18n.searchButton }}</button>

      <label>
        {{ i18n.localeLabel }}
        <select
          name="locale"
          :value="searchState.locale"
          @change="changeLocale"
        >
          <option v-for="option in supportedLocales" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
    </form>

    <p v-if="error" role="alert">{{ error }}</p>
    <section :aria-busy="loading" aria-live="polite">
      <p v-if="loading">{{ i18n.loading }}</p>
      <p>{{ i18n.formatResultCount(total) }}</p>
      <ul>
        <li v-for="result in results" :key="result.id">
          {{ result.name }} — {{ i18n.formatCurrency(result.price) }}
        </li>
      </ul>
    </section>

    <nav :aria-label="i18n.pagination">
      <button
        type="button"
        :disabled="searchState.page === 1"
        @click="goToPage(searchState.page - 1)"
      >
        {{ i18n.previousPage }}
      </button>
      <span>{{ i18n.formatPage(searchState.page) }}</span>
      <button
        type="button"
        :disabled="!loading && results.length === 0"
        @click="goToPage(searchState.page + 1)"
      >
        {{ i18n.nextPage }}
      </button>
    </nav>
  </main>
</template>
