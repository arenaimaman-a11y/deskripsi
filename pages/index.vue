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
   SEARCH (TV & MOVIES)
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
    // Cari TV dan Movie secara bersamaan
    const [tvRes, movieRes] = await Promise.all([
      $fetch('https://api.themoviedb.org/3/search/tv', {
        query: { api_key: config.public.tmdbApiKey, query: q, language: 'en-US' }
      }),
      $fetch('https://api.themoviedb.org/3/search/movie', {
        query: { api_key: config.public.tmdbApiKey, query: q, language: 'en-US' }
      })
    ])

    // Beri penanda tipe data agar URL tujuannya benar saat diklik
    const tvData = (tvRes.results || []).map(item => ({ ...item, type: 'tv' }))
    const movieData = (movieRes.results || []).map(item => ({ ...item, type: 'movie', name: item.title })) // Movie menggunakan 'title', kita aliaskan ke 'name'

    // Gabungkan dan batasi maksimal 12 baris data
    searchResults.value = [...tvData, ...movieData].slice(0, 12)
  } catch (error) {
    console.error('Search error:', error)
  } finally {
    isSearching.value = false
  }
})

/* =====================
   DATA STATE
===================== */
// TV States
const trendingTv = ref([])
const airdateTv = ref([])
const popularTv = ref([])

// Movie States
const trendingMovies = ref([])
const airdateMovies = ref([]) // Untuk film, ini diisi "Now Playing" atau "Upcoming"
const popularMovies = ref([])

onMounted(async () => {
  const today = new Date().toISOString().split('T')[0]

  try {
    const [tTv, aTv, pTv, tMv, aMv, pMv] = await Promise.all([
      // --- TV Fetch ---
      $fetch('https://api.themoviedb.org/3/trending/tv/week', { query: { api_key: config.public.tmdbApiKey } }),
      $fetch('https://api.themoviedb.org/3/discover/tv', {
        query: { api_key: config.public.tmdbApiKey, sort_by: 'first_air_date.desc', 'first_air_date.lte': today, language: 'en-US' }
      }),
      $fetch('https://api.themoviedb.org/3/discover/tv', {
        query: { api_key: config.public.tmdbApiKey, sort_by: 'popularity.desc', language: 'en-US' }
      }),
      // --- Movie Fetch ---
      $fetch('https://api.themoviedb.org/3/trending/movie/week', { query: { api_key: config.public.tmdbApiKey } }),
      $fetch('https://api.themoviedb.org/3/discover/movie', {
        query: { api_key: config.public.tmdbApiKey, sort_by: 'release_date.desc', 'release_date.lte': today, language: 'en-US' }
      }),
      $fetch('https://api.themoviedb.org/3/discover/movie', {
        query: { api_key: config.public.tmdbApiKey, sort_by: 'popularity.desc', language: 'en-US' }
      })
    ])

    // Assign data TV
    trendingTv.value = tTv.results || []
    airdateTv.value = aTv.results || []
    popularTv.value = pTv.results || []

    // Assign data Movie (serta menyamakan properti 'title' menjadi 'name' agar template seragam)
    trendingMovies.value = (tMv.results || []).map(m => ({ ...m, name: m.title }))
    airdateMovies.value = (aMv.results || []).map(m => ({ ...m, name: m.title }))
    popularMovies.value = (pMv.results || []).map(m => ({ ...m, name: m.title }))

  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  }
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
            placeholder="Search TV series & movies..."
            class="search-input"
          />
          <div v-if="isSearching" class="spinner"></div>
        </div>
      </header>

      <main class="content-area">
        <!-- ===================== SEARCH RESULTS ===================== -->
        <section v-if="searchQuery && searchResults.length" class="main-section">
          <h2 class="section-title search-title">Search Results for "{{ searchQuery }}"</h2>
          <div class="movie-grid">
            <a
              v-for="item in searchResults"
              :key="`${item.type}-${item.id}`"
              :href="`/${item.type}?id=${item.id}`"
              class="movie-card"
              @click="(event) => navigateTo(`/${item.type}?id=${item.id}`, event)"
            >
              <div class="poster-wrapper">
                <img :src="item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                <div class="card-overlay"></div>
                <!-- Mini tag penanda tipe -->
                <span class="type-tag" :class="item.type">{{ item.type.toUpperCase() }}</span>
              </div>
              <p class="movie-name">{{ item.name }}</p>
            </a>
          </div>
        </section>

        <section v-if="searchQuery && !searchResults.length && !isSearching" class="empty-state">
          <p>No results found for "{{ searchQuery }}"</p>
        </section>

        <!-- ===================== HOME SECTIONS (WHEN NOT SEARCHING) ===================== -->
        <div v-if="!searchQuery" class="dashboard-sections">
          
          <!-- 1. TRENDING SECTION -->
          <div class="dual-row">
            <section v-if="trendingTv.length" class="main-section">
              <h2 class="section-title"><span class="icon">🔥</span> Trending TV Shows</h2>
              <div class="movie-grid horizontal-scroll">
                <a v-for="tv in trendingTv.slice(0, 6)" :key="tv.id" :href="`/tv?id=${tv.id}`" class="movie-card" @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)">
                  <div class="poster-wrapper">
                    <img :src="tv.poster_path ? `https://image.tmdb.org/t/p/w342${tv.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                    <div class="card-overlay"></div>
                  </div>
                  <p class="movie-name">{{ tv.name }}</p>
                </a>
              </div>
            </section>

            <section v-if="trendingMovies.length" class="main-section">
              <h2 class="section-title"><span class="icon">🎬</span> Trending Movies</h2>
              <div class="movie-grid horizontal-scroll">
                <a v-for="movie in trendingMovies.slice(0, 6)" :key="movie.id" :href="`/movie?id=${movie.id}`" class="movie-card" @click="(event) => navigateTo(`/movie?id=${movie.id}`, event)">
                  <div class="poster-wrapper">
                    <img :src="movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                    <div class="card-overlay"></div>
                  </div>
                  <p class="movie-name">{{ movie.name }}</p>
                </a>
              </div>
            </section>
          </div>

          <!-- 2. LATEST / AIR DATE SECTION -->
          <div class="dual-row">
            <section v-if="airdateTv.length" class="main-section">
              <h2 class="section-title"><span class="icon">🗓</span> Latest Air Date (TV)</h2>
              <div class="movie-grid horizontal-scroll">
                <a v-for="tv in airdateTv.slice(0, 6)" :key="tv.id" :href="`/tv?id=${tv.id}`" class="movie-card" @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)">
                  <div class="poster-wrapper">
                    <img :src="tv.poster_path ? `https://image.tmdb.org/t/p/w342${tv.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                    <div class="card-overlay"></div>
                  </div>
                  <p class="movie-name">{{ tv.name }}</p>
                </a>
              </div>
            </section>

            <section v-if="airdateMovies.length" class="main-section">
              <h2 class="section-title"><span class="icon">🍿</span> Newly Released Movies</h2>
              <div class="movie-grid horizontal-scroll">
                <a v-for="movie in airdateMovies.slice(0, 6)" :key="movie.id" :href="`/movie?id=${movie.id}`" class="movie-card" @click="(event) => navigateTo(`/movie?id=${movie.id}`, event)">
                  <div class="poster-wrapper">
                    <img :src="movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                    <div class="card-overlay"></div>
                  </div>
                  <p class="movie-name">{{ movie.name }}</p>
                </a>
              </div>
            </section>
          </div>

          <!-- 3. MOST WATCHED / POPULAR SECTION -->
          <div class="dual-row">
            <section v-if="popularTv.length" class="main-section">
              <h2 class="section-title"><span class="icon">👀</span> Most Watched TV Shows</h2>
              <div class="movie-grid horizontal-scroll">
                <a v-for="tv in popularTv.slice(0, 6)" :key="tv.id" :href="`/tv?id=${tv.id}`" class="movie-card" @click="(event) => navigateTo(`/tv?id=${tv.id}`, event)">
                  <div class="poster-wrapper">
                    <img :src="tv.poster_path ? `https://image.tmdb.org/t/p/w342${tv.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                    <div class="card-overlay"></div>
                  </div>
                  <p class="movie-name">{{ tv.name }}</p>
                </a>
              </div>
            </section>

            <section v-if="popularMovies.length" class="main-section">
              <h2 class="section-title"><span class="icon">⭐</span> Most Watched Movies</h2>
              <div class="movie-grid horizontal-scroll">
                <a v-for="movie in popularMovies.slice(0, 6)" :key="movie.id" :href="`/movie?id=${movie.id}`" class="movie-card" @click="(event) => navigateTo(`/movie?id=${movie.id}`, event)">
                  <div class="poster-wrapper">
                    <img :src="movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : 'https://via.placeholder.com/185x278?text=No+Poster'" alt="Poster" />
                    <div class="card-overlay"></div>
                  </div>
                  <p class="movie-name">{{ movie.name }}</p>
                </a>
              </div>
            </section>
          </div>

        </div>
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

.dashboard-sections {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

/* Layout Berdampingan untuk TV dan Movie */
.dual-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

@media (max-width: 900px) {
  .dual-row {
    grid-template-columns: 1fr;
    gap: 40px;
  }
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
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

/* Mengurangi item per baris di layout berdampingan supaya tidak sesak */
.horizontal-scroll {
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
}

@media (max-width: 480px) {
  .movie-grid, .horizontal-scroll {
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

/* Type tag untuk hasil pencarian */
.type-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 2;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
}
.type-tag.tv { background-color: #3b82f6; color: white; }
.type-tag.movie { background-color: #10b981; color: white; }

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
  font-size: 0.85rem;
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
