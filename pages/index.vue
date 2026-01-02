<script setup>
import { ref, watch } from 'vue'

const config = useRuntimeConfig()

/* =====================
   SEARCH STATE
===================== */
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)

/* =====================
   SEARCH WATCH
===================== */
watch(searchQuery, async (q) => {
  if (!q || q.length < 2) {
    searchResults.value = []
    return
  }

  isSearching.value = true

  try {
    const res = await $fetch(
      'https://api.themoviedb.org/3/search/tv',
      {
        query: {
          api_key: config.public.tmdbApiKey,
          query: q,
          language: 'en-US'
        }
      }
    )

    searchResults.value = (res.results || []).slice(0, 6)
  } catch (e) {
    console.error(e)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
})
</script>

<template>
  <div class="search-page">
    <h2>Search TV Series</h2>

    <input
      v-model="searchQuery"
      placeholder="Search TV series..."
      class="search-input"
    />

    <div v-if="isSearching" class="loading">
      Searching...
    </div>

    <div v-if="searchResults.length" class="search-result">
      <div
        v-for="tv in searchResults"
        :key="tv.id"
        class="search-item"
        @click="navigateTo(`/tv?id=${tv.id}`)"
      >
        <img
          v-if="tv.poster_path"
          :src="`https://image.tmdb.org/t/p/w92${tv.poster_path}`"
        />
        <span>{{ tv.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  max-width: 600px;
  margin: auto;
  padding: 20px;
  color: #fff;
  background: #0f0f0f;
  min-height: 100vh;
}

.search-input {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #333;
  background: #1a1a1a;
  color: #fff;
  font-size: 14px;
}

.loading {
  margin-top: 10px;
  font-size: 13px;
  opacity: 0.7;
}

.search-result {
  margin-top: 10px;
  background: #111;
  border-radius: 12px;
  overflow: hidden;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.search-item:hover {
  background: #1f1f1f;
}

.search-item img {
  width: 42px;
  height: 62px;
  object-fit: cover;
  border-radius: 6px;
}

.search-item span {
  font-size: 14px;
}
</style>
