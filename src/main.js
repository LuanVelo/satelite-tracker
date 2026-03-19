import 'cesium/Build/Cesium/Widgets/widgets.css'
import './style.css'

import { initGlobe }           from './globe.js'
import { initBorders }         from './borders.js'
import { addCategory, removeCategory, getAllSatEntries, getPosition, getSatelliteCount, selectSatelliteByIndex, setTracksVisible, getTracksVisible } from './satellites.js'
import { initTimeline }        from './timeline.js'
import { initFilters }         from './filters.js'
import { initCountrySelector } from './countrySelector.js'
import { showSatelliteInfo, closeSatellitePanel, renderSatelliteList, updateCounter, startWallClock, initCountryIntel, showCountryIntel, hideCountryIntel } from './ui.js'

async function main() {
  const viewer = initGlobe()

  startWallClock()
  initTimeline(viewer)

  // Wire country intel data source
  initCountryIntel(() => {
    const now = new Date()
    return getAllSatEntries().map(({ sat, category, cssColor }) => ({
      name: sat.name, category, cssColor,
      pos: getPosition(sat.satrec, now),
    }))
  })

  initCountrySelector(viewer, {
    onSelect: (country) => showCountryIntel(country),
    onClear:  ()        => hideCountryIntel(),
  })

  setTimeout(() => initBorders(viewer), 1500)

  // Collapsible panels
  document.querySelectorAll('.panel-toggle-btn').forEach(btn => {
    const panel = document.getElementById(btn.dataset.panel)
    btn.addEventListener('click', () => {
      panel.classList.toggle('collapsed')
      btn.textContent = panel.classList.contains('collapsed') ? '▸' : '▾'
    })
  })

  // Track toggle
  const btnTracks = document.getElementById('btn-tracks')
  btnTracks.addEventListener('click', () => {
    const next = !getTracksVisible()
    setTracksVisible(next)
    btnTracks.classList.toggle('active', next)
  })

  // Close left panel
  document.getElementById('btn-close-left').addEventListener('click', closeSatellitePanel)

  // ── Multi-category helpers ─────────────────────────────────

  function rebuildList() {
    const entries = getAllSatEntries()
    renderSatelliteList(entries, (category, localIdx) => {
      selectSatelliteByIndex(viewer, category, localIdx, showSatelliteInfo)
    })
    updateCounter(getSatelliteCount())
  }

  // ── Category filters (multi-select toggle) ─────────────────
  initFilters(async (category, isActive) => {
    closeSatellitePanel()

    if (isActive) {
      updateCounter('…')
      try {
        await addCategory(viewer, category, showSatelliteInfo, rebuildList)
        updateCounter(getSatelliteCount())
      } catch (err) {
        console.error('Failed to load category:', err)
        updateCounter('!')
        // Deactivate the button on error
        document.querySelector(`.filter-btn[data-category="${category}"]`)
          ?.classList.remove('active')
      }
    } else {
      removeCategory(viewer, category)
      rebuildList()
    }
  })

  // ── Load initial category (stations) ──────────────────────
  updateCounter('…')
  try {
    await addCategory(viewer, 'stations', showSatelliteInfo, rebuildList)
    updateCounter(getSatelliteCount())
  } catch (err) {
    console.error('Failed to load initial category:', err)
    updateCounter('!')
  }
}

main()
