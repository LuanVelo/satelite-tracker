import { defineConfig } from 'vite'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  base: '/designlab/satelite-tracker/',
  plugins: [cesium()],
  server: {
    proxy: {
      '/celestrak': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/celestrak/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 SatelliteTracker/1.0',
          'Accept': 'text/plain,*/*'
        }
      }
    }
  }
})
