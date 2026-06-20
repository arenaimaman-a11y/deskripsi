<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, watch, onMounted } from 'vue'

/* =====================
   ROUTE & CONFIG
===================== */
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const tvId = route.query.id

/* =====================
   STATE
===================== */
const tv = ref(null)
const seasonList = ref([])
const seasonData = ref(null)
const landscapeImages = ref([])

const selectedSeason = ref(null)
const selectedEpisode = ref(null)

const youtubeTitle = ref('')
const youtubeDescription = ref('')

/* =====================
   POSTER
===================== */
const poster = computed(() =>
  tv.value?.poster_path
    ? 'https://image.tmdb.org/t/p/original' + tv.value.poster_path
    : 'https://via.placeholder.com/150x210?text=No+Image'
)

/* =====================
   FETCH TV DETAIL
===================== */
if (tvId) {
  const { data } = await useFetch(
    `https://api.themoviedb.org/3/tv/${tvId}`,
    {
      query: {
        api_key: config.public.tmdbApiKey,
        language: 'en-US'
      }
    }
  )

  tv.value = data.value
  seasonList.value = data.value?.seasons || []
}

/* =====================
   FETCH IMAGES (FIXED)
===================== */
function formatFullDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })
}
if (tvId) {
  const images = await $fetch(
    `https://api.themoviedb.org/3/tv/${tvId}/images`,
    {
      query: { api_key: config.public.tmdbApiKey }
    }
  )

  landscapeImages.value = (images.backdrops || []).map(img => {
    const original =
      'https://image.tmdb.org/t/p/original' + img.file_path

    return (
      'https://wsrv.nl/?url=' +
      encodeURIComponent(original) +
      '&format=jpg&n=-1&q=90'
    )
  })
}

/* =====================
   RESTORE STATE & AUTO-SELECT BY DATE
===================== */
onMounted(() => {
  if (route.query.season) {
    selectedSeason.value = Number(route.query.season)
  } else if (seasonList.value.length > 0) {
    const today = new Date()
    
    const releasedSeasons = seasonList.value.filter(s => {
      if (s.season_number === 0) return false 
      if (!s.air_date) return false
      return new Date(s.air_date) <= today
    })

    if (releasedSeasons.length > 0) {
      const latestSeason = releasedSeasons.reduce((max, s) => 
        s.season_number > max.season_number ? s : max, releasedSeasons[0]
      )
      selectedSeason.value = latestSeason.season_number
    } else {
      selectedSeason.value = seasonList.value.at(-1)?.season_number || 1
    }
  }

  if (route.query.episode) {
    selectedEpisode.value = Number(route.query.episode)
  }
})

/* =====================
   LOAD SEASON DATA & AUTO-SELECT EPISODE
===================== */
watch(selectedSeason, async (s) => {
  if (!s) return

  const data = await $fetch(
    `https://api.themoviedb.org/3/tv/${tvId}/season/${s}`,
    {
      query: {
        api_key: config.public.tmdbApiKey,
        language: 'en-US'
      }
    }
  )

  seasonData.value = data

  if (!selectedEpisode.value) {
    const today = new Date()
    
    const releasedEpisodes = (data.episodes || []).filter(e => {
      if (!e.air_date) return false
      return new Date(e.air_date) <= today
    })

    if (releasedEpisodes.length > 0) {
      selectedEpisode.value = releasedEpisodes.at(-1).episode_number
    } else {
      selectedEpisode.value = data.episodes?.at(0)?.episode_number || 1
    }
  }
})

watch(selectedSeason, () => {
  if (!route.query.episode) {
    selectedEpisode.value = null
  }
})

/* =====================
   EPISODE DATA
===================== */
const episodeData = computed(() => {
  if (!seasonData.value) return null
  return seasonData.value.episodes.find(
    e => e.episode_number == selectedEpisode.value
  )
})

/* =====================
   SEO TITLE
===================== */
const ytSuffixes = [
  'Full Episode (HD)',
  'Full Episodes',
  'Stream HD',
  'Watch Online'
]

function randomYoutubeTitle() {
  if (!tv.value || !episodeData.value) return

  const suffix =
    ytSuffixes[Math.floor(Math.random() * ytSuffixes.length)]

  youtubeTitle.value =
    `${tv.value.name} Season ${selectedSeason.value} ` +
    `Episode ${selectedEpisode.value} ${suffix}`
}

/* =====================
   DESCRIPTION
===================== */
function randomYoutubeDescription() {
  if (!tv.value || !episodeData.value) return

  const name = tv.value.name
  const s = selectedSeason.value
  const e = selectedEpisode.value

  youtubeDescription.value = `
Watch ${name} Season ${s} Episode ${e} Full HD

${name} S${s}E${e} Review
${name} Episode ${e} Highlights
${name} Season ${s} Breakdown

Thanks for watching!

#${name.replace(/\s+/g, '').toLowerCase()}
#s${s}e${e}
`.trim()
}

/* =====================
   AUTO GENERATE
===================== */
watch(episodeData, (v) => {
  if (v) {
    randomYoutubeTitle()
    randomYoutubeDescription()
  }
})

/* =====================
   COPY
===================== */
function copy(text) {
  if (!text) return
  navigator.clipboard.writeText(text)
}

/* =====================
   LINK
===================== */
const slug = computed(() =>
  tv.value
    ? tv.value.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') 
        .replace(/^-|-$/g, '')
    : ''
)

const episodeLink = computed(() => {
  if (!tv.value || !selectedSeason.value || !selectedEpisode.value) return ''
  return `http://justplay-tv.online/tv/${tvId}/${slug.value}-${selectedSeason.value}-${selectedEpisode.value}`
})

const episodeLinkOriginal = computed(() => {
  if (!tv.value || !selectedSeason.value || !selectedEpisode.value) return ''
  return `http://justplay-tv.online/tv/${tvId}/${slug.value}-${selectedSeason.value}-${selectedEpisode.value}`
})

/* =====================
   CSV EXPORT
===================== */
const customCSV = computed(() => {
  if (!tv.value || !episodeData.value) return ''

  const name = tv.value.name
  const s = selectedSeason.value
  const e = selectedEpisode.value
  const id = tvId

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const titleTemplates = [
    `${name} Season ${s} Episode ${e} Full Episode`,
    `${name} Season ${s} Episode ${e} Full Episode - (HD)`,
    `${name} Season ${s} Episode ${e} Episodes - (HD)`,
    `${name} Season ${s} Episode ${e} Full Episodes`,
    `${name} Season ${s} Episode ${e} Full Episode HD`
  ]

  const title = titleTemplates[Math.floor(Math.random() * titleTemplates.length)]

  const description = `Watch ${name} - Season ${s} Episode ${e} Full Episode

${name} S${s}E${e} HD
${name} S${s} E${e} Full HD
${name} S${s}XE${e} Full Episode
${name} S${s} X E${e} Full Episode HD
${name} Season ${s} Episode ${e} HD
${name} Season ${s} Episode ${e} Full HD
${name} Season ${s} Episode ${e} Full Episode

This video contains commentary, reactions, analysis, and discussion about ${name} Season ${s} Episode ${e}.

I hope you enjoy watching the series ${name} Season ${s} Episode ${e} on My Channel.
Subscribe to my channel and get notifications for the latest Episodes.
Thanks for visiting & watching.

#${name.replace(/\s+/g, '').toLowerCase()}
#${name.replace(/\s+/g, '').toLowerCase()}season${s}
#${name.replace(/\s+/g, '').toLowerCase()}episode${e}
#${name.replace(/\s+/g, '').toLowerCase()}s${s}e${e}
#tvseries #episodereview #seriesrecap #showbreakdown`.trim()

  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '')

  const thumbs = Array.from({ length: 5 }, (_, i) =>
    `C:\\Users\\Administrator\\Desktop\\thumb\\${safeName}_${i + 1}.jpg`
  )

  const link = `${name} S${s} E${e}: http://justplay-tv.online/tv/${id}/${slug}-${s}-${e}`

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
  if (!landscapeImages.value.length) return

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = landscapeImages.value[index]

  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1. Tambahkan Filter Kontras & Saturasi agar warna tidak flat
    ctx.filter = 'contrast(1.12) saturate(1.15)'

    // 2. Gambar frame dasar dari TMDB
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    // Reset filter supaya efek berikutnya tidak bentrok
    ctx.filter = 'none'

    // 3. Efek Vignette Gelap di setiap sudut layar (Cinematic Look)
    const vignette = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.75
    )
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.65)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 4. Tambahkan Border Garis Dalam Tipis Premium
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)

    // Simpan Blob & Eksekusi Unduhan otomatis
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      const baseName = tv.value.name
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
  for (let i = 0; i < 5; i++) {
    setTimeout(() => downloadImage(i), i * 300)
  }
}
</script>

<template>
  <div v-if="tv" class="page">
    <div class="container">
      
      <header class="header">
        <div>
          <span class="badge">Studio Mode</span>
          <h1 class="title">{{ tv.name }}</h1>
        </div>
        
        <div class="selector-group">
          <div class="select-wrapper">
            <select v-model="selectedSeason">
              <option v-for="s in seasonList" :key="s.id" :value="s.season_number">
                Season {{ s.season_number }}
              </option>
            </select>
          </div>

          <div class="select-wrapper">
            <select v-model="selectedEpisode">
              <option
                v-for="e in seasonData?.episodes"
                :key="e.id"
                :value="e.episode_number"
              >
                Eps {{ e.episode_number }} {{ e.air_date ? `(${formatFullDate(e.air_date).split(',')[0]})` : '' }}
              </option>
            </select>
          </div>
        </div>
      </header>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Generated Thumbnails</h2>
          <button class="btn btn-primary" @click="downloadAllImages">
            Download 5 Images
          </button>
        </div>
        
        <div class="thumb-grid">
          <div 
            v-for="(img, i) in landscapeImages.slice(0,5)" 
            :key="i" 
            class="thumb-card"
          >
            <img :src="img || 'https://via.placeholder.com/1280x720?text=No+Thumbnail+Available'" class="poster" alt="Thumbnail Preview" />
            <span class="thumb-index">#{{ i + 1 }}</span>
          </div>
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
              <button class="btn-copy" @click="copy(episodeLink)">Copy</button>
            </div>
            <input type="text" :value="episodeLink" readonly class="styled-input link-style" />
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  border-bottom: 1px solid #1f2937;
  padding-bottom: 24px;
}

.badge {
  background: rgba(37, 99, 235, 0.15);
  color: #3b82f6;
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
  margin: 0;
  color: #ffffff;
}

.selector-group {
  display: flex;
  gap: 12px;
}

.select-wrapper {
  position: relative;
}

.select-wrapper select {
  appearance: none;
  background-color: #111827;
  border: 1px solid #374151;
  color: #f3f4f6;
  padding: 10px 36px 10px 16px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-wrapper select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.select-wrapper::after {
  content: "↓";
  font-size: 0.8rem;
  color: #9ca3af;
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
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

.btn-primary {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
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

.btn-copy:active {
  background: #111827;
}
</style>
