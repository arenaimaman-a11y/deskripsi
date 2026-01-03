<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const config = useRuntimeConfig()

/* =====================
   NAVIGATION SAFE CTRL+CLICK
===================== */
function navigateTo(url, event) {
  // Ctrl/Cmd/klik kanan → biarkan browser handle (buka tab baru / menu konteks)
  if (event.ctrlKey || event.metaKey || event.button !== 0) return

  // Klik biasa → SPA navigation
  event.preventDefault()
  router.push(url)
}

/* =====================
   SEARCH
===================== */
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)

watch(searchQuery, async (q) => {
  if (!q || q.length < 2) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  try {
    const res = await $fetch('https://api.themoviedb.org/3/search/tv', {
      query: {
        api_key: config.public.tmdbApiKey,
        query: q,
        language: 'en-US'
      }
    })
    searchResults.value = (res.results || []).slice(0, 9)
  } finally {
    isSearching.value = false
  }
})

/* =====================
   DATA
===================== */
const trending = ref([])
const airdate = ref([])
const popular = ref([])

onMounted(async () => {
  const today = new Date().toISOString().split('T')[0]

  const [t, a, p] = await Promise.all([
    $fetch('https://api.themoviedb.org/3/trending/tv/week', {
      query: { api_key: config.public.tmdbApiKey }
    }),
    $fetch('https://api.themoviedb.org/3/discover/tv', {
      query: {
        api_key: config.public.tmdbApiKey,
        sort_by: 'first_air_date.desc',
        'first_air_date.lte': today,
        language: 'en-US'
      }
    }),
    $fetch('https://api.themoviedb.org/3/discover/tv', {
      query: {
        api_key: config.public.tmdbApiKey,
        sort_by: 'popularity.desc',
        language: 'en-US'
      }
    })
  ])

  trending.value = t.results || []
  airdate.value = a.results || []
  popular.value = p.results || []
})
</script>

<template>
  <div class="page">

    <!-- SEARCH -->
    <input
      v-model="searchQuery"
      placeholder="Search TV series..."
      class="search"
    />

    <div v-if="isSearching" class="loading">Searching…</div>

    <!-- SEARCH RESULT -->
    <div v-if="searchResults.length" class="grid">
      <a
        v-for="tv in searchResults"
        :key="tv.id"
        :href="`/tv?id=${tv.id}`"
        class="card"
        @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)"
      >
        <img :src="`https://image.tmdb.org/t/p/w185${tv.poster_path}`" />
        <p>{{ tv.name }}</p>
      </a>
    </div>

    <!-- TRENDING -->
    <section v-if="!searchQuery">
      <h3>🔥 Trending</h3>
      <div class="grid">
        <a
          v-for="tv in trending"
          :key="tv.id"
          :href="`/tv?id=${tv.id}`"
          class="card"
          @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)"
        >
          <img :src="`https://image.tmdb.org/t/p/w185${tv.poster_path}`" />
          <p>{{ tv.name }}</p>
        </a>
      </div>
    </section>

    <!-- AIR DATE -->
    <section v-if="!searchQuery">
      <h3>🗓 Latest Air Date</h3>
      <div class="grid">
        <a
          v-for="tv in airdate"
          :key="tv.id"
          :href="`/tv?id=${tv.id}`"
          class="card"
          @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)"
        >
          <img :src="`https://image.tmdb.org/t/p/w185${tv.poster_path}`" />
          <p>{{ tv.name }}</p>
        </a>
      </div>
    </section>

    <!-- POPULAR -->
    <section v-if="!searchQuery">
      <h3>👀 Most Watched</h3>
      <div class="grid">
        <a
          v-for="tv in popular"
          :key="tv.id"
          :href="`/tv?id=${tv.id}`"
          class="card"
          @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)"
        >
          <img :src="`https://image.tmdb.org/t/p/w185${tv.poster_path}`" />
          <p>{{ tv.name }}</p>
        </a>
      </div>
    </section>

  </div>
</template>

<style scoped>
.page {
  background:#0f0f0f;
  min-height:100vh;
  padding:20px;
  color:#fff;
}

.search {
  width:100%;
  padding:12px;
  border-radius:10px;
  background:#1a1a1a;
  border:1px solid #333;
  color:#fff;
  margin-bottom:10px;
}

.loading {
  opacity:.7;
  margin-bottom:10px;
}

section {
  margin-top:24px;
}

section h3 {
  margin-bottom:10px;
  font-size:16px;
}

.grid {
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(140px,1fr));
  gap:12px;
}

.card {
  cursor:pointer;
  display:block;
  text-decoration:none; /* hilangkan underline */
  color: inherit;
}

.card img {
  width:100%;
  border-radius:10px;
}

.card p {
  font-size:13px;
  margin-top:6px;
}
</style>
