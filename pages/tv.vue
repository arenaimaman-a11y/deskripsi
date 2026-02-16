<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, watch, onMounted } from 'vue'

/* =====================
   ROUTE & CONFIG
===================== */
const randomThumbIndex = ref(0)
const route = useRoute()
const router = useRouter()
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
const landscapeImages = ref([]) // isi 3 gambar berbeda

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
// =====================
// RANDOM THUMB INDEX (FOR SELENIUM)
// =====================
watch(
  landscapeImages,
  (imgs) => {
    if (!imgs || imgs.length === 0) return
    randomThumbIndex.value = Math.floor(Math.random() * imgs.length)
  },
  { immediate: true }
)
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
const mainHashtag = computed(() => {
  if (!tv.value || !selectedSeason.value || !selectedEpisode.value) return ''

  const slug = tv.value.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  return `https://justplay-tv.online/tv?id=${tvId}&season=${selectedSeason.value}&episode=${selectedEpisode.value}`
})


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
  // 🔹 PRIORITAS 1: URL
  if (route.query.season) {
    selectedSeason.value = Number(route.query.season)
  }

  if (route.query.episode) {
    selectedEpisode.value = Number(route.query.episode)
  }

  // 🔹 PRIORITAS 2: localStorage
  if (!selectedSeason.value || !selectedEpisode.value) {
    const saved = localStorage.getItem(`tv_state_${tvId}`)
    if (saved) {
      const s = JSON.parse(saved)
      selectedSeason.value ||= s.season
      selectedEpisode.value ||= s.episode
    }
  }

  // 🔹 PRIORITAS 3: default season terbaru
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
    if (!tvId || !s || !e) return

    router.replace({
      query: {
        id: tvId,
        season: s,
        episode: e
      }
    })
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
  'Full Episodes',
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

  // =====================
  // RANDOM TITLE
  // =====================
  const titleTemplates = [
    `${name} Season ${s} Episode ${e} Full Episode (HD)`,
    `${name} Season ${s} Episode ${e} Full Episode`,
    `${name} Season ${s} Episode ${e} (HD)`,
    `${name} Season ${s} Episode ${e} - HD`,
    `${name} Season ${s} Episode ${e} - Full Episode`
  ]

  const title =
    titleTemplates[Math.floor(Math.random() * titleTemplates.length)]

  // =====================
  // DESCRIPTION
  // =====================
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

// =====================
// RANDOM THUMBNAIL (namaseries-1.jpg)
// =====================
const randomThumb = Math.floor(Math.random() * 5) + 1

const safeName = name
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
const thumbnail = `C:\\Users\\AsSaLamuaLaikuM\\Desktop\\thumb\\${safeName}_${randomThumb}.jpg`



// =====================
// CUSTOM LINK FORMAT
// =====================
const seleniumComment = computed(() => {
  if (!tv.value || !selectedSeason.value || !selectedEpisode.value) return ''

  const name = tv.value.name
  const s = selectedSeason.value
  const e = selectedEpisode.value

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  return `${name} S${s} E${e}: https://justplay-tv.online/tv/${tvId}/${slug}-S${s}-E${e}`
})

const slug = name
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')

const comment = `${name} S${s} E${e}: http://justplay-tv.online/tv/${tvId}/${slug}-S${s}-E${e}`


  // =====================
  // CSV OUTPUT
  // =====================
  return `${title},"${description}",${thumbnail},"${comment}"`
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
function pickRandomImages () {
  if (!Array.isArray(allImages.value)) return
  if (allImages.value.length < 5) return

  const unique = new Set()
  const selected = []

  while (selected.length < 5) {
    const randIndex = Math.floor(Math.random() * allImages.value.length)
    const img = allImages.value[randIndex]

    if (!unique.has(img.file_path)) {
      unique.add(img.file_path)
      selected.push(img)
    }
  }

  landscapeImages.value = selected.map(r => {
    const original = 'https://image.tmdb.org/t/p/original' + r.file_path
    return (
      'https://wsrv.nl/?url=' +
      encodeURIComponent(original) +
      '&format=jpg&n=-1&q=90'
    )
  })
}


watch(tv, v => v && pickRandomImages(), { immediate: true })
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

  // Blur background dulu
  ctx.filter = 'blur(6px)'
  ctx.drawImage(
    img,
    x,
    y,
    img.width * scale,
    img.height * scale
  )

  // Gambar lagi versi normal di atasnya (biar tidak terlalu blur)
  ctx.filter = 'none'
  ctx.drawImage(
    img,
    x,
    y,
    img.width * scale,
    img.height * scale
  )

  }
}


// =====================
// DOWNLOAD IMAGE < 2MB (AUTO COMPRESS)
// =====================
async function downloadImage(index) {
  if (!landscapeImages.value?.length || !tv.value) return

  const imgUrl = landscapeImages.value[index]
  if (!imgUrl) return

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imgUrl

  img.onload = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    const ctx = canvas.getContext('2d')

    const scale = Math.max(
      canvas.width / img.width,
      canvas.height / img.height
    )

    const x = (canvas.width - img.width * scale) / 2
    const y = (canvas.height - img.height * scale) / 2

    ctx.drawImage(
      img,
      x,
      y,
      img.width * scale,
      img.height * scale
    )
/* =====================
   TOP LEFT PREMIUM
===================== */

const season = selectedSeason.value
const episode = selectedEpisode.value
const topText = `S${season} EP${episode}`

// RANDOM HOOK
const hooks = [
  'SHOCKING TWIST',
  'YOU WON’T EXPECT THIS',
  'THE TRUTH REVEALED',
  'BIG REVEAL',
  'INTENSE MOMENT',
  'MAJOR CLIFFHANGER',
  'THIS CHANGES EVERYTHING',
  'FINAL WARNING',
  'UNBELIEVABLE ENDING'
]

const randomHook = hooks[Math.floor(Math.random() * hooks.length)]

// POSISI KIRI ATAS
ctx.textAlign = 'left'
ctx.textBaseline = 'top'

const padding = 40
const leftX = padding
let textY = padding

// ===== S EP =====
ctx.font = `800 42px Impact`
ctx.lineWidth = 6
ctx.strokeStyle = '#000'
ctx.shadowColor = 'rgba(0,0,0,0.8)'
ctx.shadowBlur = 12

ctx.strokeText(topText, leftX, textY)

const goldGrad1 = ctx.createLinearGradient(0, textY, 0, textY + 50)
goldGrad1.addColorStop(0, '#fff8dc')
goldGrad1.addColorStop(0.5, '#ffd700')
goldGrad1.addColorStop(1, '#b8860b')

ctx.fillStyle = goldGrad1
ctx.fillText(topText, leftX, textY)

// ===== HOOK =====
textY += 60

ctx.font = `900 68px Impact`
ctx.lineWidth = 10
ctx.strokeStyle = '#000'
ctx.shadowColor = 'rgba(0,0,0,0.9)'
ctx.shadowBlur = 25

ctx.strokeText(randomHook, leftX, textY)

const goldGrad2 = ctx.createLinearGradient(0, textY - 40, 0, textY + 80)
goldGrad2.addColorStop(0, '#fff8dc')
goldGrad2.addColorStop(0.3, '#ffd700')
goldGrad2.addColorStop(0.6, '#ffb700')
goldGrad2.addColorStop(1, '#b8860b')

ctx.fillStyle = goldGrad2
ctx.fillText(randomHook, leftX, textY)

ctx.shadowBlur = 0


    /* =====================
       BRANDING
    ===================== */
    const brandText = 'JUSTPLAY-TV.ONLINE'
    ctx.font = `600 26px Arial`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(brandText, 30, canvas.height - 30)

    /* =====================
       COMPRESS <2MB
    ===================== */
    let quality = 0.9
    let blob

    do {
      blob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      )
      quality -= 0.05
    } while (blob.size > 2 * 1024 * 1024 && quality > 0.4)

    const url = URL.createObjectURL(blob)

    /* =====================
       CLEAN TITLE (NO SPACE, NO SYMBOL)
    ===================== */
    const baseName = tv.value.name
  .toLowerCase()
  .replace(/[^a-z0-9]/gi, '') // hanya huruf & angka
  .replace(/\s+/g, '')       // hilangkan spasi

const filename = `${baseName}_${index + 1}.jpg`


    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()

    URL.revokeObjectURL(url)
  }
}


</script>


<template>
  <div class="page" v-if="tv">
    <div class="card">



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
      <div v-if="landscapeImages.length" class="thumb-grid">
  <img
    v-for="(img, i) in landscapeImages"
    :key="i"
    :src="img"
    class="poster"
    draggable="true"
  />
</div>


<div v-if="landscapeImages.length" class="actions">
  <button @click="downloadImage(0)">Download Thumb 1</button>
  <button @click="downloadImage(1)">Download Thumb 2</button>
  <button @click="downloadImage(2)">Download Thumb 3</button>
  <button @click="downloadImage(3)">Download Thumb 4</button>
  <button @click="downloadImage(4)">Download Thumb 5</button>
</div>


<div v-if="episodeData" class="box">
<textarea id="yt-title" :value="youtubeTitle" readonly></textarea>
<textarea id="yt-description" :value="youtubeDescription" readonly></textarea>
<textarea id="yt-url" :value="mainHashtag" readonly></textarea>
  <div class="actions">
    <button @click="randomYoutubeTitle">🎲 Random</button>
    <button @click="copy(youtubeTitle)">📋 Copy Judul</button>
    <button @click="copy(mainHashtag)">#️⃣ Copy Hashtag</button>
  </div>
</div>



<div v-if="episodeData" class="box">
  <label>Deskripsi YouTube SEO</label>

  <textarea rows="2" :value="youtubeDescription" readonly />

  <div class="actions">
    <button @click="randomYoutubeDescription">🎲 Random</button>
    <button @click="copy(youtubeDescription)">📋 Copy</button>
  </div>
</div>

<!-- Kolom Custom Deskripsi (CSV style, otomatis) -->
<div v-if="episodeData" class="box">
  <label>Custom Deskripsi CSV (Editable)</label>
  <textarea
    rows="2"
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
  <!-- =====================
     SELENIUM READ ONLY
===================== -->
<div v-if="tv && landscapeImages.length" style="display:none">

  <!-- POSTER -->
  <img
    id="selenium-poster"
    :src="poster"
    alt="poster"
  />

  <!-- LANDSCAPE THUMBNAILS -->
  <img
    v-for="(img, i) in landscapeImages"
    :key="'selenium-' + i"
    :id="`selenium-thumb-${i+1}`"
    :src="img"
    alt="thumbnail"
  />

</div>
<!-- COMMENT LINK (SELENIUM) -->
<textarea
  id="selenium-comment"
  :value="seleniumComment"
  readonly
></textarea>

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
  height: 90px;          /* 👈 bikin lebih pendek */
  object-fit: cover;    /* potong rapi */
  border-radius: 12px;
  margin-bottom: 12px;
}

.thumb-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.thumb-grid .poster {
  height: 70px;      /* 👈 lebih kecil dari poster utama */
  margin-bottom: 0;
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
