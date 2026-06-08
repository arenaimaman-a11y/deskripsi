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
    <div class="container">
      
      <header class="search-header">
        <div class="brand">
          <span class="badge-dot"></span>
          <h1 class="main-title">JustPlay Dashboard</h1>
        </div>
        
        <div class="search-box">
          <input
            v-model="searchQuery"
            placeholder="Search TV series..."
            class="search-input"
          />
          <div v-if="isSearching" class="spinner"></div>
        </div>
      </header>

      <main class="content-area">
        <section v-if="searchQuery && searchResults.length" class="main-section">
          <h2 class="section-title search-title">Search Results for "{{ searchQuery }}"</h2>
          <div class="movie-grid">
            <a
              v-for="tv in searchResults"
              :key="tv.id"
              :href="`/tv?id=${tv.id}`"
              class="movie-card"
              @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)"
            >
              <div class="poster-wrapper">
                <img :src="tv.poster_path ? `https://image.tmdb.org/t/p/w342${tv.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                <div class="card-overlay"></div>
              </div>
              <p class="movie-name">{{ tv.name }}</p>
            </a>
          </div>
        </section>

        <section v-if="searchQuery && !searchResults.length && !isSearching" class="empty-state">
          <p>No results found for "{{ searchQuery }}"</p>
        </section>

        <section v-if="!searchQuery && trending.length" class="main-section">
          <div class="section-header">
            <h2 class="section-title"><span class="icon">🔥</span> Trending</h2>
          </div>
          <div class="movie-grid">
            <a
              v-for="tv in trending"
              :key="tv.id"
              :href="`/tv?id=${tv.id}`"
              class="movie-card"
              @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)"
            >
              <div class="poster-wrapper">
                <img :src="tv.poster_path ? `https://image.tmdb.org/t/p/w342${tv.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                <div class="card-overlay"></div>
              </div>
              <p class="movie-name">{{ tv.name }}</p>
            </a>
          </div>
        </section>

        <section v-if="!searchQuery && airdate.length" class="main-section">
          <div class="section-header">
            <h2 class="section-title"><span class="icon">🗓</span> Latest Air Date</h2>
          </div>
          <div class="movie-grid">
            <a
              v-for="tv in airdate"
              :key="tv.id"
              :href="`/tv?id=${tv.id}`"
              class="movie-card"
              @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)"
            >
              <div class="poster-wrapper">
                <img :src="tv.poster_path ? `https://image.tmdb.org/t/p/w342${tv.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                <div class="card-overlay"></div>
              </div>
              <p class="movie-name">{{ tv.name }}</p>
            </a>
          </div>
        </section>

        <section v-if="!searchQuery && popular.length" class="main-section">
          <div class="section-header">
            <h2 class="section-title"><span class="icon">👀</span> Most Watched</h2>
          </div>
          <div class="movie-grid">
            <a
              v-for="tv in popular"
              :key="tv.id"
              :href="`/tv?id=${tv.id}`"
              class="movie-card"
              @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)"
            >
              <div class="poster-wrapper">
                <img :src="tv.poster_path ? `https://image.tmdb.org/t/p/w342${tv.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                <div class="card-overlay"></div>
              </div>
              <p class="movie-name">{{ tv.name }}</p>
            </a>
          </div>
        </section>
      </main>

    </div>
  </div>
</template>

<style scoped>
/* =====================
   GLOBAL STYLE & RESET
===================== */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.page {
  font-family: 'Inter', sans-serif;
  background-color: #0b0f19;
  color: #f3f4f6;
  min-height: 100vh;
  padding: 40px 20px;
  box-sizing: border-box;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* =====================
   HEADER & SEARCH AREA
===================== */
.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px 32px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge-dot {
  width: 10px;
  height: 10px;
  background-color: #2563eb;
  border-radius: 50%;
  box-shadow: 0 0 12px #2563eb;
}

.main-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  color: #ffffff;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 450px;
  min-width: 280px;
}

.search-input {
  width: 100%;
  background: #1f2937;
  border: 1px solid #374151;
  color: #ffffff;
  border-radius: 12px;
  padding: 14px 44px 14px 18px;
  font-size: 0.95rem;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #2563eb;
  background: #1f2937;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
}

/* SEARCH LOADER SPINNER */
.spinner {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

/* =====================
   MAIN CONTENT & SECTIONS
===================== */
.content-area {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.main-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-title {
  color: #60a5fa;
}

.icon {
  font-size: 1.35rem;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  font-size: 0.95rem;
}

/* =====================
   MOVIE RESPONSIVE GRID
===================== */
.movie-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 20px;
}

@media (max-width: 480px) {
  .movie-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
}

/* =====================
   PREMIUM CARD STYLE
===================== */
.movie-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  group: hover;
}

.poster-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 2/3;
  border-radius: 14px;
  overflow: hidden;
  background-color: #111827;
  border: 1px solid #1f2937;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.poster-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(11, 15, 25, 0.4) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* CARD INTERACTIONS EFFECT */
.movie-card:hover .poster-wrapper {
  transform: translateY(-6px);
  border-color: #3b82f6;
  box-shadow: 0 12px 24px -4px rgba(37, 99, 235, 0.25);
}

.movie-card:hover img {
  transform: scale(1.04);
}

.movie-card:hover .card-overlay {
  opacity: 1;
}

.movie-card:hover .movie-name {
  color: #60a5fa;
}

/* TEXT NAME STYLE */
.movie-name {
  font-size: 0.88rem;
  font-weight: 500;
  color: #cbd5e1;
  margin: 10px 0 0 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;
}
</style>
