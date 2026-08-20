<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, watch, onMounted } from 'vue'

/* =====================
   ROUTE & CONFIG
===================== */
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const tvId = route.query.id || '60989' // Default fallback ID

/* =====================
   STATE
===================== */
const tv = ref(null)
const seasonList = ref([])
const seasonData = ref(null)
const landscapeImages = ref([])
const trailerUrl = ref('')

const selectedSeason = ref(null)
const selectedEpisode = ref(null)

const youtubeTitle = ref('')
const youtubeDescription = ref('')
const isGeneratingGemini = ref(false)

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
   FETCH IMAGES, VIDEOS (TRAILER) & FORMAT
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
    const original = 'https://image.tmdb.org/t/p/original' + img.file_path
    return (
      'https://wsrv.nl/?url=' +
      encodeURIComponent(original) +
      '&format=jpg&n=-1&q=90'
    )
  })

  // Fetch Trailer Link
  const videos = await $fetch(
    `https://api.themoviedb.org/3/tv/${tvId}/videos`,
    {
      query: { api_key: config.public.tmdbApiKey, language: 'en-US' }
    }
  )

  const trailer = (videos.results || []).find(
    v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  )

  if (trailer) {
    trailerUrl.value = `https://www.youtube.com/watch?v=${trailer.key}`
  }
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
   LOAD SEASON DATA
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
   EPISODE DATA & LINKS
===================== */
const episodeData = computed(() => {
  if (!seasonData.value) return null
  return seasonData.value.episodes.find(
    e => e.episode_number == selectedEpisode.value
  )
})

const slug = computed(() =>
  tv.value
    ? tv.value.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') 
        .replace(/^-|-$/g, '')
    : ''
)

/* =====================
   URL AWAL (TANPA SHORTLINK)
===================== */
const targetUrl = computed(() => {
  if (!tv.value || !selectedSeason.value || !selectedEpisode.value) return ''

  const id = tvId || tv.value.id || ''
  const formattedSlug = tv.value.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

  return `https://www.usflix.online/tv/${id}/${formattedSlug}-${selectedSeason.value}-${selectedEpisode.value}`
})

/* =====================
   GENERATE GEMINI AI (ENGLISH & RANDOM)
===================== */
async function generateWithGemini() {
  if (!tv.value || !episodeData.value) return
  isGeneratingGemini.value = true

  try {
    const response = await $fetch('/api/gemini-generate', {
      method: 'POST',
      body: {
        showName: tv.value.name,
        season: selectedSeason.value,
        episode: selectedEpisode.value,
        overview: episodeData.value.overview || tv.value.overview
      }
    })

    if (response.success) {
      youtubeTitle.value = response.data.title
      youtubeDescription.value = response.data.description
    }
  } catch (err) {
    console.error("Gemini Generation Error:", err)
    
    youtubeTitle.value = `${tv.value.name} Season ${selectedSeason.value} Episode ${selectedEpisode.value} [F.u.l.l E.p.i.s.o.d.e]`
    youtubeDescription.value = `Watch Silo - Season 3 Episode 7 Full Episode\n\nSilo S3E7 HD\nSilo S3 E7 Full HD\nSilo S3XE7 Full Episode\nSilo S3 X E7 Full Episode HD\nSilo Season 3 Episode 7 HD\nSilo Season 3 Episode 7 Full HD\nSilo Season 3 Episode 7 Full Episode\n\nThis video contains commentary, reactions, analysis, and discussion about Silo Season 3 Episode 7.\n\nI hope you enjoy watching the series Silo Season 3 Episode 7 on My Channel.\nSubscribe to my channel and get notifications for the latest Episodes.\nThanks for visiting & watching.\n\n#silo\n#siloseason3\n#siloepisode7\n#silos3e7\n#tvseries #episodereview #seriesrecap #showbreakdown`
  } finally {
    isGeneratingGemini.value = false
  }
}

// Auto-trigger Gemini when episode changes
watch(episodeData, (v) => {
  if (v) {
    generateWithGemini()
  }
})

/* =====================
   CSV EXPORT GENERATOR
===================== */
const customCSV = computed(() => {
  if (!tv.value || !episodeData.value) return ''

  const name = tv.value.name
  const s = selectedSeason.value
  const e = selectedEpisode.value
  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '')

  const titleTemplates = [
    `${name} Season ${s} Episode ${e} Full HD`,
    `${name} Season ${s} Episode ${e} Full Episode`,
    `${name} Season ${s} Episode ${e} Full Episode - (HD)`
  ]

  const randomTitle = titleTemplates[Math.floor(Math.random() * titleTemplates.length)]

  const fullDescription = `Watch ${name} - Season ${s} Episode ${e} Full Episode\n\n${name} S${s}E${e} HD\n${name} S${s} E${e} Full HD\n${name} S${s}XE${e} Full Episode\n${name} S${s} X E${e} Full Episode HD\n${name} Season ${s} Episode ${e} HD\n${name} Season ${s} Episode ${e} Full HD\n${name} Season ${s} Episode ${e} Full Episode\n\nThis video contains commentary, reactions, analysis, and discussion about ${name} Season ${s} Episode ${e}.\n\nI hope you enjoy watching the series ${name} Season ${s} Episode ${e} on My Channel.\nSubscribe to my channel and get notifications for the latest Episodes.\nThanks for visiting & watching.\n\n#${cleanName.toLowerCase()}\n#${cleanName.toLowerCase()}season${s}\n#${cleanName.toLowerCase()}episode${e}\n#${cleanName.toLowerCase()}s${s}e${e}\n#tvseries #episodereview #seriesrecap #showbreakdown`

  const thumbs = Array.from({ length: 5 }, (_, i) => 
    `C:\\Users\\Administrator\\Desktop\\thumb\\${safeName}_s${s}e${e}_${i + 1}.jpg`
  )

  const commentText = `Watch ${name} S${s} E${e} Full Ep: ${targetUrl.value}`

  return [
    `"${randomTitle.replace(/"/g, '""')}"`,
    `"${fullDescription.replace(/"/g, '""')}"`,
    ...thumbs,
    `"${commentText.replace(/"/g, '""')}"`
  ].join(',')
})

/* =====================
   DOWNLOAD IMAGE WITH CANVAS & WATERMARK
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

    // 1. Filter Kontras & Saturasi
    ctx.filter = 'contrast(1.08) saturate(1.12)'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.filter = 'none'

    // 2. Overlay Gradient Soft Bawah
    const gradient = ctx.createLinearGradient(0, 420, 0, 720)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.75)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 420, 1280, 300)

    // 3. WATERMARK TEXT "JUDUL" & "S{season}E{episode}"
    const showNameUpper = (tv.value?.name || 'SHOW').toUpperCase()
    const seasonEpText = `S${selectedSeason.value}E${selectedEpisode.value}`

    ctx.textAlign = 'center'
    
    // Shadow Lembut
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetX = 3
    ctx.shadowOffsetY = 4

    // Line 1: Judul Film/Series
    ctx.font = '800 72px "Inter", "Segoe UI", sans-serif'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(showNameUpper, 640, 580)

    // Line 2: S1E7
    ctx.font = '900 56px "Inter", "Segoe UI", sans-serif'
    ctx.fillStyle = '#FFD700'
    ctx.fillText(seasonEpText, 640, 645)

    // Reset Shadow
    ctx.shadowColor = 'transparent'

    // 4. Border Tipis Elegant
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8)

    // Eksekusi Download
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const baseName = tv.value.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      a.download = `${baseName}_s${selectedSeason.value}e${selectedEpisode.value}_${index + 1}.jpg`
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

function copy(text) {
  if (!text) return
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <div v-if="tv" class="page">
    <div class="container">
      
      <!-- HEADER -->
      <header class="header">
        <div>
          <span class="badge">Studio Mode + Gemini AI (English)</span>
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

      <!-- THUMBNAILS SECTION -->
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
            <img :src="img || 'https://via.placeholder.com/1280x720?text=No+Thumbnail'" class="poster" alt="Thumbnail Preview" />
            <span class="thumb-index">#{{ i + 1 }}</span>
            <div class="watermark-preview">
              <div class="wm-title">{{ tv.name }}</div>
              <div class="wm-ep">S{{ selectedSeason }}E{{ selectedEpisode }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- YOUTUBE METADATA SECTION -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">YouTube Metadata (AI Generated)</h2>
          <button class="btn btn-secondary" @click="generateWithGemini" :disabled="isGeneratingGemini">
            {{ isGeneratingGemini ? 'Generating AI...' : 'Re-generate Random AI' }}
          </button>
        </div>
        
        <div class="grid-inputs">
          <div class="input-card">
            <div class="input-header">
              <label>Video Title (Bypass Safe)</label>
              <button class="btn-copy" @click="copy(youtubeTitle)">Copy</button>
            </div>
            <input type="text" :value="youtubeTitle" readonly class="styled-input" />
          </div>

          <div class="input-card">
            <div class="input-header">
              <label>Target Direct Link</label>
              <button class="btn-copy" @click="copy(targetUrl)">
                Copy Link
              </button>
            </div>
            <input 
              type="text" 
              :value="targetUrl" 
              readonly 
              class="styled-input link-style" 
            />
          </div>

          <div class="input-card">
            <div class="input-header">
              <label>Trailer Link</label>
              <button class="btn-copy" @click="copy(trailerUrl)">Copy Link</button>
            </div>
            <input type="text" :value="trailerUrl" readonly class="styled-input link-style" placeholder="No trailer available" />
          </div>
        </div>

        <div class="input-card huge-box">
          <div class="input-header">
            <label>Video Description (English - No Links)</label>
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;500&display=swap');

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
  content: "▼";
  font-size: 0.8rem;
  color: #9ca3af;
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

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
  display: block;
  transition: transform 0.3s ease;
}

.thumb-card:hover .poster {
  transform: scale(1.05);
}

.thumb-index {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 2;
}

.watermark-preview {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0, 0, 0, 0.85) 100%);
  padding: 12px 6px 6px 6px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.wm-title {
  font-size: 0.85rem;
  font-weight: 800;
  color: #FFFFFF;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.9));
  line-height: 1.1;
}

.wm-ep {
  font-size: 0.75rem;
  font-weight: 900;
  color: #FFD700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  filter: drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.9));
}

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

.btn-secondary {
  background: #374151;
  color: #ffffff;
}

.btn-secondary:hover {
  background: #4b5563;
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
