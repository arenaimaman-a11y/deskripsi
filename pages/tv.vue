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
   FETCH IMAGES & FORMAT
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
   EPISODE DATA & LINKS
===================== */
// Generasi Shortlink dengan format: https://justplay-tv.online/tv/{tvId}/{slug}-{season}-{episode}
/* =====================
   SHORTLINK NATIVE (AMAN & DIRECT TO YOUTUBE)
===================== */
/* =====================
   SHORTLINK FORMAT (http://www.justplay-tv.online/tv/60625/rick-and-morty-9-10)
===================== */
const shortlinkUrl = computed(() => {
  if (!tv.value || !selectedSeason.value || !selectedEpisode.value) return ''

  const id = tvId || (tv.value && tv.value.id) || ''
  
  // Membuat slug nama film/series (misal: "Rick and Morty" -> "rick-and-morty")
  const formattedSlug = tv.value.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Hapus karakter khusus
    .trim()
    .replace(/\s+/g, '-')        // Ubah spasi jadi dash (-)

  const season = selectedSeason.value
  const episode = selectedEpisode.value

  // Output: http://www.justplay-tv.online/tv/60625/rick-and-morty-9-10
  return `https://justplay-tv.online/tv/${id}/${formattedSlug}-${season}-${episode}`
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
    
    // Fallback English Templates (No Links)
    const name = tv.value.name
    const s = selectedSeason.value
    const e = selectedEpisode.value
    
    const fallbackTemplates = [
      `Watch ${name} Season ${s} Episode ${e} Full HD.\n\n${episodeData.value?.overview || ''}\n\n🔴 FULL EPISODE LINK IS PINNED IN THE TOP COMMENT BELOW! 👇\n\n#${name.replace(/\s+/g, '')} #s${s}e${e} #tvseries`,
      `Full breakdown and review for ${name} S${s}E${e}.\n\nCatch all the exciting moments and plot twists in this latest episode.\n\n📌 Streaming Link is AVAILABLE IN THE PINNED COMMENT! 👇\n\n#${name.replace(/\s+/g, '')} #episoderecap #fullhd`
    ]
    
    youtubeTitle.value = `${name} Season ${s} Episode ${e} [F.u.l.l E.p.i.s.o.d.e]`
    youtubeDescription.value = fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)]
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
  const synopsis = (episodeData.value.overview || tv.value.overview || 'No overview available.').replace(/"/g, '""')
  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '')

  // 1. Variasi Judul Acak
  const titleTemplates = [
    `${name} Season ${s} Episode ${e} Full Episode Breakdown & Review (HD)`,
    `Watch ${name} S${s}E${e} Full Episode Analysis [FULL HD]`,
    `${name} Season ${s} Episode ${e} (HD) Official Recap & Story Details`,
    `[FULL HD] ${name} S${s} E${e} Full Episode Discussion and Review`,
    `${name} Season ${s} Episode ${e} Breakdown - Full Episode Overview (HD)`,
    `Official Recap: ${name} Season ${s} Episode ${e} Full Episode [HD Quality]`,
    `${name} S${s}E${e} (HD) Full Episode Storyline & Scene Analysis`,
    `[HD] ${name} Season ${s} Episode ${e} Full Episode Details & Reaction`
  ]

  // 2. Variasi Paragraf Pembuka Deskripsi
  const introTemplates = [
    `Welcome to the full episode breakdown for ${name} Season ${s} Episode ${e}. In this latest chapter, the story takes an intriguing turn as key plot points unfold.`,
    `Here is the complete guide and storyline summary for ${name} S${s}E${e}. Read below for full episode details and plot highlights.`,
    `Exploring the events of ${name} Season ${s} Episode ${e}. Catch up on all the major character arcs and dramatic moments from this broadcast.`,
    `A detailed overview of ${name} Season ${s} Episode ${e}. Discover what happens in this exciting new installment of the series.`
  ]

  // 3. Variasi Penutup Deskripsi
  const outroTemplates = [
    `Stay tuned for more episode updates, season breakdowns, and deep dives into ${name}. Share your thoughts about Season ${s} Episode ${e} in the comments below!`,
    `Make sure to subscribe for future episode recaps, show theories, and updates regarding ${name} Season ${s}.`,
    `What was your favorite moment from ${name} S${s}E${e}? Leave a comment and join the discussion with other fans!`,
    `For more coverage on ${name} and other trending TV series, don't forget to like and bookmark this page.`
  ]

  // Pilih kalimat acak setiap kali CSV dipanggil
  const randomTitle = titleTemplates[Math.floor(Math.random() * titleTemplates.length)]
  const randomIntro = introTemplates[Math.floor(Math.random() * introTemplates.length)]
  const randomOutro = outroTemplates[Math.floor(Math.random() * outroTemplates.length)]

  // Gabungkan Deskripsi Lengkap
  const fullDescription = `${randomIntro}\n\nEpisode Overview:\n${synopsis}\n\n${randomOutro}\n\n#${cleanName} #${cleanName}Season${s} #s${s}e${e} #tvseries #episoderecap`

  // Format path thumbnail lokal
  const season = selectedSeason.value
  const episode = selectedEpisode.value

  const thumbs = Array.from({ length: 5 }, (_, i) => 
    `C:\\Users\\Administrator\\Desktop\\thumb\\${safeName}_s${season}e${episode}_${i + 1}.jpg`
  )

  // --- PERUBAHAN DI SINI ---
  // Membuat teks komentar gabungan Judul + Link
  const commentText = `Watch ${name} S${s} E${e} Full Ep: ${shortlinkUrl.value}`

  // Output CSV murni
  return [
    `"${randomTitle.replace(/"/g, '""')}"`,
    `"${fullDescription.replace(/"/g, '""')}"`,
    ...thumbs,
    `"${commentText.replace(/"/g, '""')}"` // <-- Menggunakan commentText yang berisi Judul + Link
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
    ctx.filter = 'contrast(1.12) saturate(1.15)'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.filter = 'none'

    // 2. Efek Vignette Gelap
    const vignette = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.75
    )
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.65)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 3. Overlay Gelap Bawah
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.fillRect(0, 480, 1280, 240)

    // 4. WATERMARK TEXT "FULL EPISODE X"
    const overlayText = `FULL EPISODE ${selectedEpisode.value}`
    ctx.font = 'bold 85px Arial, sans-serif'
    ctx.textAlign = 'center'
    
    // Outline Hitam Tegas
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 14
    ctx.strokeText(overlayText, 640, 610)
    
    // Warna Kuning
    ctx.fillStyle = '#FFD700'
    ctx.fillText(overlayText, 640, 610)

    // 5. Border Tipis Premium
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)

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
            <div class="watermark-preview">FULL EPISODE {{ selectedEpisode }}</div>
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
              <label>Target Shortlink (For Pinned Comment)</label>
              <button class="btn-copy" @click="copy(shortlinkUrl)">Copy Link</button>
            </div>
            <input type="text" :value="shortlinkUrl" readonly class="styled-input link-style" />
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
  content: "↓";
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
  font-size: 0.75rem;
  font-weight: 900;
  color: #FFD700;
  text-shadow: 1px 1px 3px #000;
  background: rgba(0, 0, 0, 0.65);
  padding: 4px 0;
  z-index: 2;
  letter-spacing: 0.05em;
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