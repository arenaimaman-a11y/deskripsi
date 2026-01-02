export default defineNuxtConfig({
  css: ['~/assets/main.css'],
  runtimeConfig: {
    public: {
      tmdbApiKey: process.env.TMDB_API_KEY
    }
  }
})
