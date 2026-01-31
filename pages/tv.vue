<script setup>
import { ref, computed, watch, onMounted } from 'vue'

/* =====================
   ROUTE & CONFIG
===================== */
const route = useRoute()
const config = useRuntimeConfig()
const tvId = route.query.id
const DOMAIN = 'https://www.justplay-tv.online'

/* =====================
   STATE
===================== */
const tv = ref(null)
const seasonList = ref([])
const seasonData = ref(null)
const posterJPG = ref('')
const landscapeImage = ref('')

const poster = computed(() =>
  tv.value?.poster_path
    ? 'https://image.tmdb.org/t/p/original' + tv.value.poster_path
    : 'https://via.placeholder.com/150x210?text=No+Image'
)

const selectedSeason = ref(null)
const selectedEpisode = ref(null)

const titleIndex = ref(0)

const allImages = ref([])
const mainImage = ref('')

/* =====================
   FLAG (ANTI RESET)
===================== */
const isRestored = ref(false)

/* =====================
   LOAD TV DETAIL
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
  seasonList.value = data.value.seasons || []
}
function formatMonthYear(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  })
}

function formatFullDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })
}

/* =====================
   LOAD ALL IMAGES
===================== */
if (tvId) {
  const images = await $fetch(
    `https://api.themoviedb.org/3/tv/${tvId}/images`,
    { query: { api_key: config.public.tmdbApiKey } }
  )
  allImages.value = images.backdrops || []
}

/* =====================
   RESTORE STATE
===================== */
onMounted(() => {
  const saved = localStorage.getItem(`tv_state_${tvId}`)
  if (saved) {
    const s = JSON.parse(saved)
    selectedSeason.value = s.season
    selectedEpisode.value = s.episode
  }

  if (!selectedSeason.value && seasonList.value.length) {
    const today = new Date()
    const released = seasonList.value.filter(
      s => s.air_date && new Date(s.air_date) <= today
    )
    selectedSeason.value =
      released.at(-1)?.season_number ||
      seasonList.value.at(-1)?.season_number
  }

  isRestored.value = true
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
    selectedEpisode.value =
      data.episodes?.at(-1)?.episode_number || 1
  }
})

watch(tv, (v) => {
  if (v) convertPosterToJPG()
})

/* =====================
   SAVE STATE
===================== */
watch(
  () => [selectedSeason.value, selectedEpisode.value],
  ([s, e]) => {
    if (!isRestored.value) return
    if (!s || !e) return
    localStorage.setItem(
      `tv_state_${tvId}`,
      JSON.stringify({ season: s, episode: e })
    )
  }
)

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
   BASIC SEO (SITE)
===================== */
const seoKeywords = [
  'Watch Online','Full Episode','HD','Free Streaming',
  'Latest Episode','New Season'
]

const powerWords = [
  'Must Watch','Explained','Big Twist','Final Scene','Shocking'
]

const aiTitles = computed(() => {
  if (!tv.value || !episodeData.value) return []
  return Array.from({ length: 100 }).map(() => {
    const seo = seoKeywords[Math.floor(Math.random() * seoKeywords.length)]
    const power = powerWords[Math.floor(Math.random() * powerWords.length)]
    return `${tv.value.name} Season ${selectedSeason.value} Episode ${selectedEpisode.value} ${seo} – ${power}`
  })
})

const titleText = computed(() => aiTitles.value[titleIndex.value] || '')

function randomTitle () {
  titleIndex.value = Math.floor(Math.random() * aiTitles.value.length)
}

/* =====================
   YOUTUBE SEO (US) – STRONG & RANDOM
===================== */
const youtubeTitle = ref('')
const youtubeDescription = ref('')

const ytSuffixes = [
  'Full Episode (HD)',
  'Full Episode',
  'Full Episode HD',
  'Stream HD',
  "Stream - (HD)",
  '- (HD)'
]






function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomYoutubeTitle () {
  if (!tv.value || !episodeData.value) return

  const suffix = ytSuffixes[Math.floor(Math.random() * ytSuffixes.length)]

  youtubeTitle.value =
    `${tv.value.name} Season ${selectedSeason.value} ` +
    `Episode ${selectedEpisode.value} ${suffix}`
}

// =====================
// CUSTOM DESKRIPSI OTOMATIS
// =====================
const customDescription = computed(() => {
  if (!tv.value || !episodeData.value) return ''

  const name = tv.value.name
  const s = selectedSeason.value
  const e = selectedEpisode.value

  const videoFile = `${name.replace(/\s+/g, '').toLowerCase()}.mp4`
  const title = `${name} Season ${s} Episode ${e} Full Episode (HD)`
  const description = `
🎬 Watch ${name} - Season ${s} Episode ${e} Full Episode

${name} S${s}E${e} HD
${name} S${s} E${e} Full HD
${name} S${s}XE${e} Full Episode
${name} S${s} X E${e} Full Episode HD
${name} Season ${s} Episode ${e} HD
${name} Season ${s} Episode ${e} Full HD
${name} Season ${s} Episode ${e} Full Episode

I hope you enjoy watching the series ${name} Season ${s} Episode ${e} on My Channel.
Subscribe to my channel and get notifications for the latest Episodes.
Thanks for visiting & watching.

#${name.replace(/\s+/g, '').toLowerCase()}
#${name.replace(/\s+/g, '').toLowerCase()}season${s}
#${name.replace(/\s+/g, '').toLowerCase()}episode${e}
#${name.replace(/\s+/g, '').toLowerCase()}s${s}e${e}
#tvseries #episodereview #seriesrecap #showbreakdown
`.trim()

  const thumbnail = `${name.replace(/\s+/g, '').toLowerCase()}.jpg`
  const privacy = 'public'
  const duration = '22' // misal durasi

  return `${videoFile},${title},"${description}",${thumbnail},${privacy},${duration}`
})


function randomYoutubeDescription () {
  if (!tv.value || !episodeData.value) return

  const name = tv.value.name
  const s = selectedSeason.value
  const e = selectedEpisode.value

  youtubeDescription.value = `
🎬 Watch ${name} - Season ${s} Episode ${e} Full Episode

${name} S${s}E${e} HD
${name} S${s} E${e} Full HD
${name} S${s}XE${e} Full Episode
${name} S${s} X E${e} Full Episode HD
${name} Season ${s} Episode ${e} HD
${name} Season ${s} Episode ${e} Full HD
${name} Season ${s} Episode ${e} Full Episode


I hope you enjoy watching the series ${name} Season ${s} Episode ${e} on My Channel.
Subscribe to my channel and get notifications for the latest Episodes.
Thanks for visiting & watching.

#${name.replace(/\s+/g, '').toLowerCase()}
#${name.replace(/\s+/g, '').toLowerCase()}season${s}
#${name.replace(/\s+/g, '').toLowerCase()}episode${e}
#${name.replace(/\s+/g, '').toLowerCase()}s${s}e${e}
#tvseries #episodereview #seriesrecap #showbreakdown
`.trim()
}


/* AUTO GENERATE SETIAP EPISODE GANTI */
watch(episodeData, (v) => {
  if (v) {
    randomYoutubeTitle()
    randomYoutubeDescription()
  }
})


/* =====================
   LINK
===================== */
const slug = computed(() =>
  tv.value
    ? tv.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    : ''
)

const episodeLink = computed(() => {
  if (!slug.value || !selectedSeason.value || !selectedEpisode.value) return ''

  return `${tv.value.name} S${selectedSeason.value} E${selectedEpisode.value}: https://go.justplay-tv.online/tv/${tvId}/${selectedSeason.value}/${selectedEpisode.value}`
})

const episodeLinkOriginal = computed(() => {
  if (!tvId || !selectedSeason.value || !selectedEpisode.value) return ''

  return `${tv.value.name} S${selectedSeason.value} E${selectedEpisode.value}: https://justplay-tv.online/tv/${tvId}/${slug.value}-S${selectedSeason.value}-E${selectedEpisode.value}`
})


function copy(text) {
  if (!text) return
  navigator.clipboard.writeText(text)
}


/* =====================
   RANDOM IMAGE
===================== */
function pickRandomImage () {
  // GUARD LEVEL 1
  if (!Array.isArray(allImages.value)) return

  // GUARD LEVEL 2
  if (allImages.value.length === 0) return

  const index = Math.floor(Math.random() * allImages.value.length)
  const r = allImages.value[index]

  // GUARD LEVEL 3
  if (!r || !r.file_path) return

  const original =
    'https://image.tmdb.org/t/p/original' + r.file_path

  // PAKSA JPG (ANTI WEBP, DRAG AMAN)
  landscapeImage.value =
    'https://wsrv.nl/?url=' +
    encodeURIComponent(original) +
    '&format=jpg&n=-1&q=90'
}

watch(tv, v => v && pickRandomImage(), { immediate: true })
async function convertPosterToJPG() {
  if (!tv.value?.poster_path) return

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = poster.value

  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(img, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (blob) posterJPG.value = URL.createObjectURL(blob)
      },
      'image/jpeg',
      0.95
    )
  }
}
// =====================
// DOWNLOAD IMAGE LANGSUNG (semua huruf kecil, tanpa spasi)
// =====================
async function downloadImage() {
  if (!landscapeImage.value || !tv.value) return

  try {
    // Ambil gambar sebagai blob
    const response = await fetch(landscapeImage.value)
    const blob = await response.blob()

    // Buat object URL
    const url = URL.createObjectURL(blob)

    // Nama file: semua lowercase, hapus spasi
    const name = tv.value.name.replace(/\s+/g, '').toLowerCase() + '.jpg'

    const link = document.createElement('a')
    link.href = url
    link.download = name

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Hapus object URL setelah download
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Download gagal:', err)
  }
}

</script>


<template>
  <div class="page" v-if="tv">
    <div class="card">

<img
  v-if="landscapeImage"
  class="poster"
  :src="landscapeImage"
  draggable="true"
/>



      <div class="row">
        <select v-model="selectedSeason">
          <option v-for="s in seasonList" :key="s.id" :value="s.season_number">
            Season {{ s.season_number }}
              <span v-if="s.air_date">
    ({{ formatMonthYear(s.air_date) }})
  </span>
          </option>
        </select>

        <select v-model="selectedEpisode">
          <option
            v-for="e in seasonData?.episodes"
            :key="e.id"
            :value="e.episode_number"
          >
            Episode {{ e.episode_number }}
            <span v-if="e.air_date">
    ({{ formatFullDate(e.air_date) }})
  </span>
          </option>
        </select>
      </div>
<img
  v-if="landscapeImage"
  class="poster"
  :src="landscapeImage"
  draggable="true"
/>
<div v-if="landscapeImage" class="actions">
  <button @click="downloadImage">⬇️ Download Image</button>
</div>

<div v-if="episodeData" class="box">
  <label>Judul YouTube SEO (US)</label>

  <textarea rows="2" :value="youtubeTitle" readonly />

  <div class="actions">
    <button @click="randomYoutubeTitle">🎲 Random</button>
    <button @click="copy(youtubeTitle)">📋 Copy</button>
  </div>
</div>


<div v-if="episodeData" class="box">
  <label>Deskripsi YouTube SEO</label>

  <textarea rows="5" :value="youtubeDescription" readonly />

  <div class="actions">
    <button @click="randomYoutubeDescription">🎲 Random</button>
    <button @click="copy(youtubeDescription)">📋 Copy</button>
  </div>
</div>

<!-- Kolom Custom Deskripsi (CSV style, otomatis) -->
<div v-if="episodeData" class="box">
  <label>Custom Deskripsi CSV (Editable)</label>
  <textarea
    rows="7"
    :value="customDescription"
    readonly
  ></textarea>
  <div class="actions">
    <button @click="copy(customDescription)">📋 Copy</button>
  </div>
</div>


      <!-- BOX ATAS -->
<div v-if="episodeData" class="box link-vertical">
  <label>Link Episode (Original)</label>
  <input :value="episodeLinkOriginal" readonly />
  <button @click="copy(episodeLinkOriginal)">🔗 Copy </button>
</div>

<!-- BOX BAWAH (INI YANG KAMU MAKSUD) -->
<div v-if="episodeData" class="box link-vertical">
  <label>Link (Cineflix)</label>
  <input :value="episodeLink" readonly />
  <button @click="copy(episodeLink)">🔗 Copy </button>
</div>
    </div>
  </div>
</template>

<style scoped>
.page {
  background: #0f0f0f;
  min-height: 100vh;
  padding: 20px;
  display: flex;
  justify-content: center;
}

.card {
  background: #161616;
  max-width: 600px;
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  color: #fff;
}

  .poster {
  width: 100%;
  max-height: 140px;     /* 🔥 BATASI TINGGI */
  object-fit: cover;    /* potong rapi, tidak gepeng */
  border-radius: 12px;
  margin-bottom: 12px;
}

.row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

select,
input,
textarea {
  width: 100%;
  background: #222;
  border: 1px solid #333;
  color: #fff;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
}

textarea {
  resize: none;
}

.box {
  margin-bottom: 16px;
}

label {
  font-size: 13px;
  opacity: 0.8;
  display: block;
  margin-bottom: 6px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

button {
  background: #2563eb;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
}
/* =====================
   TWO COLUMN LINK BOX
===================== */
.two-col {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

.two-col label {
  grid-column: 1 / -1;
}

.two-col input {
  min-width: 0;
}

.two-col button {
  white-space: nowrap;
}

</style>
