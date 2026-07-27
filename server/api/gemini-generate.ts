import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { showName, season, episode, overview } = body

  const name = showName || 'TV Show'
  const s = season || 1
  const e = episode || 1
  const synopsis = overview || 'No overview available for this episode.'
  
  // Bersihkan nama show untuk hashtag SEO
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '')

  // 1. Variasi Judul SEO & Natural (Bypass Safe YouTube)
  const titleTemplates = [
    `${name} Season ${s} Episode ${e} Full Episode Breakdown & Review`,
    `${name} S${s}E${e} Episode Analysis - Official Overview`,
    `Watch ${name} Season ${s} Episode ${e} HD Recap & Story Details`,
    `${name} S${s} E${e} Full Episode Discussion and Recap`,
    `${name} Season ${s} Episode ${e} [FULL HD] Complete Storyline`,
    `Official Recap: ${name} Season ${s} Episode ${e} - Full Details`
  ]

  // 2. Variasi Paragraf Pembuka SEO
  const introTemplates = [
    `Welcome to the full episode breakdown for ${name} Season ${s} Episode ${e}. In this latest chapter, the story takes an intriguing turn as key plot points unfold.`,
    `Here is the complete guide and storyline summary for ${name} S${s}E${e}. Read below for full episode details and plot highlights.`,
    `Exploring the events of ${name} Season ${s} Episode ${e}. Catch up on all the major character arcs and dramatic moments from this broadcast.`,
    `A detailed overview of ${name} Season ${s} Episode ${e}. Discover what happens in this exciting new installment of the series.`
  ]

  // 3. Variasi Header Sinopsis
  const synopsisHeaders = [
    "📌 Official Synopsis & Plot Summary:",
    "🎬 Episode Overview:",
    "📖 Storyline Breakdown:",
    "📝 Official Episode Details:"
  ]

  // 4. Variasi Paragraf Penutup (SEO Optimization Tanpa Link / Spam Keyword)
  const outroTemplates = [
    `Stay tuned for more episode updates, season breakdowns, and deep dives into ${name}. Share your thoughts about Season ${s} Episode ${e} in the comments below!`,
    `Make sure to subscribe for future episode recaps, show theories, and updates regarding ${name} Season ${s}.`,
    `What was your favorite moment from ${name} S${s}E${e}? Leave a comment and join the discussion with other fans!`,
    `For more coverage on ${name} and other trending TV series, don't forget to like and bookmark this page.`
  ]

  // 5. Acak Komponen
  const randomTitle = titleTemplates[Math.floor(Math.random() * titleTemplates.length)]
  const randomIntro = introTemplates[Math.floor(Math.random() * introTemplates.length)]
  const randomHeader = synopsisHeaders[Math.floor(Math.random() * synopsisHeaders.length)]
  const randomOutro = outroTemplates[Math.floor(Math.random() * outroTemplates.length)]

  // 6. Formulasi Deskripsi SEO (Bersih, Tanpa Link, Alami)
  const fullDescription = `${randomIntro}\n\n${randomHeader}\n${synopsis}\n\n${randomOutro}\n\n#${cleanName} #${cleanName}Season${s} #s${s}e${e} #tvseries #episoderecap #tvshow`

  return {
    success: true,
    data: {
      title: randomTitle,
      description: fullDescription
    }
  }
})