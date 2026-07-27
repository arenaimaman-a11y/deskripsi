<template>
  <div class="flex items-center justify-center min-h-screen bg-slate-900 text-white">
    <div class="text-center p-6">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto mb-4"></div>
      <p class="text-lg font-medium">Redirecting to video...</p>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()

onMounted(() => {
  const code = route.params.code

  if (code) {
    try {
      // Decode 6 karakter/base64 kembali ke data asli (ID-Season-Episode)
      // Jika butuh decode khusus, sesuaikan di sini
      const decoded = atob(code.padEnd(Math.ceil(code.length / 4) * 4, '='))
      const [tvId, season, episode] = decoded.split('-')

      if (tvId && season && episode) {
        // Redirect ke halaman episode spesifik
        window.location.href = `https://justplay-tv.online/tv/${tvId}`
      } else {
        // Fallback jika format kode tidak cocok
        window.location.href = 'https://justplay-tv.online'
      }
    } catch (e) {
      // Fallback jika error decoding
      window.location.href = 'https://justplay-tv.online'
    }
  } else {
    window.location.href = 'https://justplay-tv.online'
  }
})
</script>