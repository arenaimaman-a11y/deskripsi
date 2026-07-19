<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, watch } from 'vue'

/* =====================
   ROUTE & CONFIG
===================== */
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const movieId = route.query.id

/* =====================
   STATE
===================== */
const movie = ref(null)
const landscapeImages = ref([])

const youtubeTitle = ref('')
const youtubeDescription = ref('')

/* =====================
   POSTER
===================== */
const poster = computed(() =>
  movie.value?.poster_path
    ? 'https://image.tmdb.org/t/p/original' + movie.value.poster_path
    : 'https://via.placeholder.com/150x210?text=No+Image'
)

/* =====================
   FETCH MOVIE DETAIL
===================== */
if (movieId) {
  const { data } = await useFetch(
    `https://api.themoviedb.org/3/movie/${movieId}`,
    {
      query: {
        api_key: config.public.tmdbApiKey,
        language: 'en-US'
      }
    }
  )

  movie.value = data.value
}

/* =====================
   FETCH IMAGES
===================== */
function formatFullDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })
}

if (movieId) {
  const images = await $fetch(
    `https://api.themoviedb.org/3/movie/${movieId}/images`,
    {
      query: { api_key: config.public.tmdbApiKey }
    }
  )

  landscapeImages.value = (images.backdrops || []).map(img => {
    const original = 'https://image.tmdb.org/t/p/original' + img.file_path

    return (
      'https://wsrv.nl/?url=' +
      encodeURIComponent(original) +
      '&format=jpg&n=-1&q=90'
    )
  })
}

/* =====================
   SEO TITLE & DESCRIPTION FOR MOVIE
===================== */
const ytSuffixes = [
  'Full Movie (HD)',
  'Full Movie Online',
  'Stream HD',
  'Watch Online'
]

function generateYoutubeMetadata() {
  if (!movie.value) return

  const titleText = movie.value.title
  const suffix = ytSuffixes[Math.floor(Math.random() * ytSuffixes.length)]

  // Generate Title
  youtubeTitle.value = `${titleText} ${suffix}`

  // Generate Description
  youtubeDescription.value = `
Watch ${titleText} Full Movie HD

${titleText} Movie Review
${titleText} Official Highlights
${titleText} Full Movie Breakdown & Reaction

Thanks for watching!

#${titleText.replace(/\s+/g, '').toLowerCase()}
#fullmoviehd
#moviereview
`.trim()
}

// Trigger metadata generation begitu data movie tersedia
watch(movie, (v) => {
  if (v) {
    generateYoutubeMetadata()
  }
}, { immediate: true })

/* =====================
   COPY FUNCTION
===================== */
function copy(text) {
  if (!text) return
  navigator.clipboard.writeText(text)
}

/* =====================
   LINK GENERATION
===================== */
const slug = computed(() =>
  movie.value
    ? movie.value.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') 
        .replace(/^-|-$/g, '')
    : ''
)

const movieLink = computed(() => {
  if (!movie.value) return ''
  return `https://us.justplay-tv.online/movie/${movieId}/${slug.value}`
})

/* =====================
   CSV EXPORT (MOVIE ADAPTED)
===================== */
const customCSV = computed(() => {
  if (!movie.value) return ''

  const titleText = movie.value.title
  const id = movieId

  const titleTemplates = [
    `${titleText} Full Movie`,
    `${titleText} Full Movie - (HD)`,
    `${titleText} Movie Online - (HD)`,
    `${titleText} Full Movie Streaming`,
    `${titleText} Full Movie HD`
  ]

  const title = titleTemplates[Math.floor(Math.random() * titleTemplates.length)]

  const description = `Watch ${titleText} Full Movie Online

${titleText} Full Movie HD
${titleText} Full Streaming HD
${titleText} Full Movie Review

This video contains commentary, reactions, analysis, and discussion about the movie ${titleText}.

I hope you enjoy watching the movie ${titleText} on My Channel.
Subscribe to my channel and get notifications for the latest movie updates.
Thanks for visiting & watching.

#${titleText.replace(/\s+/g, '').toLowerCase()}
#${titleText.replace(/\s+/g, '').toLowerCase()}movie
#fullmovie #moviereview #cinemarecap #moviebreakdown`.trim()

  const safeName = titleText.toLowerCase().replace(/[^a-z0-9]/g, '')

  const thumbs = Array.from({ length: 5 }, (_, i) =>
    `C:\\Users\\Administrator\\Desktop\\thumb\\${safeName}_${i + 1}.jpg`
  )

  const link = `${titleText} Full Movie: https://justplay-tv.online/movie/${id}/${slug.value}`

  return [
    title,
    `"${description}"`,
    ...thumbs,
    `"${link}"`
  ].join(',')
})

/* =====================
   DOWNLOAD IMAGE (WITH EDITS)
===================== */
function downloadImage(index) {
  if (!landscapeImages.value.length || !landscapeImages.value[index]) return

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = landscapeImages.value[index]

  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1. Filter Kontras & Saturasi
    ctx.filter = 'contrast(1.12) saturate(1.15)'

    // 2. Gambar frame dasar dari TMDB
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    // Reset filter
    ctx.filter = 'none'

    // 3. Efek Vignette Gelap (Cinematic Look)
    const vignette = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.75
    )
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.65)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 4. Border Garis Dalam Tipis Premium
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)

    // Simpan Blob & Eksekusi Unduhan otomatis
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      const baseName = movie.value.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

      const filename = `${baseName}_${index + 1}.jpg`

      a.download = filename
      a.click()

      URL.revokeObjectURL(url)
    }, 'image/jpeg', 0.92)
  }
}

function downloadAllImages() {
  const limit = Math.min(5, landscapeImages.value.length)
  for (let i = 0; i < limit; i++) {
    setTimeout(() => downloadImage(i), i * 300)
  }
}
</script>

<template>
  <div v-if="movie" class="page">
    <div class="container">
      
      <header class="header">
        <div>
          <span class="badge">Studio Mode • Movie</span>
          <h1 class="title">{{ movie.title }}</h1>
          <p class="release-date" v-if="movie.release_date">
            Released: {{ formatFullDate(movie.release_date) }}
          </p>
        </div>
      </header>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Generated Thumbnails</h2>
          <button 
            class="btn btn-primary" 
            @click="downloadAllImages"
            :disabled="!landscapeImages.length"
          >
            Download {{ Math.min(5, landscapeImages.length) }} Images
          </button>
        </div>
        
        <div v-if="landscapeImages.length" class="thumb-grid">
          <div 
            v-for="(img, i) in landscapeImages.slice(0, 5)" 
            :key="i" 
            class="thumb-card"
          >
            <img :src="img" class="poster" alt="Thumbnail Preview" />
            <span class="thumb-index">#{{ i + 1 }}</span>
          </div>
        </div>
        <div v-else class="empty-images">
          <p>No backdrop images available for this movie.</p>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">YouTube Metadata</h2>
        
        <div class="grid-inputs">
          <div class="input-card">
            <div class="input-header">
              <label>Video Title</label>
              <button class="btn-copy" @click="copy(youtubeTitle)">Copy</button>
            </div>
            <input type="text" :value="youtubeTitle" readonly class="styled-input" />
          </div>

          <div class="input-card">
            <div class="input-header">
              <label>Target URL</label>
              <button class="btn-copy" @click="copy(movieLink)">Copy</button>
            </div>
            <input type="text" :value="movieLink" readonly class="styled-input link-style" />
          </div>
        </div>

        <div class="input-card huge-box">
          <div class="input-header">
            <label>Video Description</label>
            <button class="btn-copy" @click="copy(youtubeDescription)">Copy Description</button>
          </div>
          <textarea :value="youtubeDescription" readonly class="styled-textarea"></textarea>
        </div>

        <div class="input-card csv-box">
          <div class="input-header">
            <label>CSV Bulk Row Data</label>
            <button class="btn-copy" @click="copy(customCSV)">Copy CSV String</button>
          </div>
          <textarea :value="customCSV" readonly class="styled-textarea code-font"></textarea>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
/* =====================
   GLOBAL RESET & THEME 
===================== */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

.page {
  font-family: 'Inter', sans-serif;
  background-color: #0b0f19;
  color: #f3f4f6;
  min-height: 100vh;
  padding: 40px 20px;
  box-sizing: border-box;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* =====================
   HEADER WORKSPACE
===================== */
.header {
  border-bottom: 1px solid #1f2937;
  padding-bottom: 24px;
}

.badge {
  background: rgba(16, 185, 129, 0.15); /* Hijau Emerald khusus Movie */
  color: #10b981;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-block;
  margin-bottom: 8px;
}

.title {
  font-size: 1.85rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 6px 0;
  color: #ffffff;
}

.release-date {
  font-size: 0.9rem;
  color: #9ca3af;
  margin: 0;
}

/* =====================
   SECTIONS & INTERFACES
===================== */
.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #9ca3af;
  margin: 0;
  letter-spacing: 0.02em;
}

/* =====================
   THUMBNAILS GRID
===================== */
.thumb-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

@media (max-width: 900px) {
  .thumb-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 600px) {
  .thumb-grid { grid-template-columns: repeat(2, 1fr); }
}

.thumb-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #1f2937;
  background-color: #111827;
  aspect-ratio: 16/9;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.thumb-card:hover .poster {
  transform: scale(1.05);
}

.thumb-index {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.empty-images {
  background: #111827;
  border: 1px dashed #374151;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

/* =====================
   INPUTS & CONTAINERS
===================== */
.grid-inputs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .grid-inputs { grid-template-columns: 1fr; }
}

.input-card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-header label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.styled-input, .styled-textarea {
  width: 100%;
  background: #1f2937;
  border: 1px solid #374151;
  color: #f3f4f6;
  border-radius: 8px;
  padding: 12px;
  font-size: 0.9rem;
  box-sizing: border-box;
  font-family: inherit;
}

.styled-input:focus, .styled-textarea:focus {
  outline: none;
  border-color: #2563eb;
  background: #1f2937;
}

.link-style {
  color: #60a5fa;
  font-weight: 500;
}

.styled-textarea {
  resize: vertical;
  min-height: 140px;
  line-height: 1.6;
}

.huge-box .styled-textarea {
  min-height: 220px;
}

.code-font {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: #34d399;
}

/* =====================
   BUTTONS INTERACTIVE
===================== */
.btn {
  font-family: inherit;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn-copy {
  background: #1f2937;
  border: 1px solid #374151;
  color: #cbd5e1;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-copy:hover {
  background: #374151;
  color: #ffffff;
  border-color: #4b5563;
}
</style>
