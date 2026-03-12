import 'cesium/Build/Cesium/Widgets/widgets.css'
import './style.css'

import { initGlobe }         from './globe.js'
import { loadSatellites, clearSatellites, getSatelliteCount, currentSatData } from './satellites.js'
import { initTimeline }      from './timeline.js'
import { initFilters }       from './filters.js'
import { initLocationPicker } from './locationPicker.js'
import { showSatelliteInfo, showPasses, updateCounter, startWallClock } from './ui.js'

async function main() {
  // 1. Boot globe (sync — imagery loads async in background)
  const viewer = initGlobe()

  // 2. Start wall clock
  startWallClock()

  // 3. Init timeline controls
  initTimeline(viewer)

  // 4. Load initial category
  let currentCategory = 'stations'
  await loadCategory(currentCategory)

  // 5. Category filters
  initFilters(async (category) => {
    if (category === currentCategory) return
    currentCategory = category
    await loadCategory(category)
  })

  // 6. Location picker: click globe to see passes
  initLocationPicker(
    viewer,
    () => currentSatData,
    (passes, lat, lon) => showPasses(passes, lat, lon)
  )

  async function loadCategory(category) {
    updateCounter('…')
    try {
      await loadSatellites(viewer, category, (satInfo) => {
        showSatelliteInfo(satInfo)
      })
      updateCounter(getSatelliteCount())
    } catch (err) {
      console.error('Failed to load satellites:', err)
      updateCounter('!')
    }
  }
}

main()
