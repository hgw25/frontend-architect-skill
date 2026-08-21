<script setup lang="ts">
import { onMounted, ref } from 'vue'

type SearchResult = {
  id: string
  name: string
  price: number
}

const query = ref('')
const page = ref(1)
const locale = ref('en-US')
const results = ref<SearchResult[]>([])
const total = ref(0)
const error = ref('')

async function search() {
  error.value = ''
  try {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query.value)}&page=${page.value}`,
    )
    const payload = (await response.json()) as {
      items: SearchResult[]
      total: number
    }
    results.value = payload.items
    total.value = payload.total
  } catch {
    error.value = 'Search failed'
  }
}

onMounted(search)
</script>

<template>
  <main>
    <h1>Product search</h1>
    <form @submit.prevent="search">
      <label>
        Search
        <input v-model="query" name="query" />
      </label>
      <button type="submit">Search</button>
    </form>

    <p v-if="error" role="alert">{{ error }}</p>
    <p aria-live="polite">{{ total }} results</p>
    <ul>
      <li v-for="result in results" :key="result.id">
        {{ result.name }} — ${{ result.price }}
      </li>
    </ul>
  </main>
</template>
