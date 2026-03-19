import * as Cesium from 'cesium'
import { highlightCountry, clearHighlight } from './borders.js'

const COUNTRIES = [
  { name: 'Afghanistan',          iso:   4, lat:  33.93, lon:  67.71, alt: 1200 },
  { name: 'Albania',              iso:   8, lat:  41.15, lon:  20.17, alt:  250 },
  { name: 'Algeria',              iso:  12, lat:  28.03, lon:   1.66, alt: 2500 },
  { name: 'Argentina',            iso:  32, lat: -38.42, lon: -63.62, alt: 3500 },
  { name: 'Australia',            iso:  36, lat: -25.27, lon: 133.78, alt: 5000 },
  { name: 'Austria',              iso:  40, lat:  47.52, lon:  14.55, alt:  450 },
  { name: 'Bangladesh',           iso:  50, lat:  23.68, lon:  90.36, alt:  500 },
  { name: 'Belgium',              iso:  56, lat:  50.50, lon:   4.47, alt:  250 },
  { name: 'Bolivia',              iso:  68, lat: -16.29, lon: -63.59, alt: 1200 },
  { name: 'Brazil',               iso:  76, lat: -14.24, lon: -51.93, alt: 5000 },
  { name: 'Canada',               iso: 124, lat:  56.13, lon:-106.35, alt: 6000 },
  { name: 'Chile',                iso: 152, lat: -35.68, lon: -71.54, alt: 2500 },
  { name: 'China',                iso: 156, lat:  35.86, lon: 104.20, alt: 5000 },
  { name: 'Colombia',             iso: 170, lat:   4.57, lon: -74.30, alt: 1500 },
  { name: 'Czech Republic',       iso: 203, lat:  49.82, lon:  15.47, alt:  400 },
  { name: 'Denmark',              iso: 208, lat:  56.26, lon:   9.50, alt:  600 },
  { name: 'Egypt',                iso: 818, lat:  26.82, lon:  30.80, alt: 1500 },
  { name: 'Ethiopia',             iso: 231, lat:   9.15, lon:  40.49, alt: 1500 },
  { name: 'Finland',              iso: 246, lat:  61.92, lon:  25.75, alt: 1000 },
  { name: 'France',               iso: 250, lat:  46.23, lon:   2.21, alt: 1200 },
  { name: 'Germany',              iso: 276, lat:  51.17, lon:  10.45, alt:  900 },
  { name: 'Ghana',                iso: 288, lat:   7.95, lon:  -1.02, alt:  700 },
  { name: 'Greece',               iso: 300, lat:  39.07, lon:  21.82, alt:  700 },
  { name: 'Hungary',              iso: 348, lat:  47.16, lon:  19.50, alt:  500 },
  { name: 'India',                iso: 356, lat:  20.59, lon:  78.96, alt: 4000 },
  { name: 'Indonesia',            iso: 360, lat:  -0.79, lon: 113.92, alt: 3500 },
  { name: 'Iran',                 iso: 364, lat:  32.43, lon:  53.69, alt: 1800 },
  { name: 'Iraq',                 iso: 368, lat:  33.22, lon:  43.68, alt:  900 },
  { name: 'Ireland',              iso: 372, lat:  53.41, lon:  -8.24, alt:  600 },
  { name: 'Israel',               iso: 376, lat:  31.05, lon:  34.85, alt:  350 },
  { name: 'Italy',                iso: 380, lat:  41.87, lon:  12.57, alt: 1400 },
  { name: 'Japan',                iso: 392, lat:  36.20, lon: 138.25, alt: 1800 },
  { name: 'Jordan',               iso: 400, lat:  30.59, lon:  36.24, alt:  500 },
  { name: 'Kazakhstan',           iso: 398, lat:  48.02, lon:  66.92, alt: 3000 },
  { name: 'Kenya',                iso: 404, lat:  -0.02, lon:  37.91, alt: 1200 },
  { name: 'Mexico',               iso: 484, lat:  23.63, lon:-102.55, alt: 3000 },
  { name: 'Morocco',              iso: 504, lat:  31.79, lon:  -7.09, alt: 1000 },
  { name: 'Netherlands',          iso: 528, lat:  52.13, lon:   5.29, alt:  350 },
  { name: 'New Zealand',          iso: 554, lat: -40.90, lon: 174.89, alt: 1500 },
  { name: 'Nigeria',              iso: 566, lat:   9.08, lon:   8.68, alt: 1500 },
  { name: 'North Korea',          iso: 408, lat:  40.34, lon: 127.51, alt:  800 },
  { name: 'Norway',               iso: 578, lat:  60.47, lon:   8.47, alt: 1500 },
  { name: 'Pakistan',             iso: 586, lat:  30.38, lon:  69.35, alt: 1800 },
  { name: 'Peru',                 iso: 604, lat:  -9.19, lon: -75.02, alt: 1600 },
  { name: 'Philippines',          iso: 608, lat:  12.88, lon: 121.77, alt: 1500 },
  { name: 'Poland',               iso: 616, lat:  51.92, lon:  19.15, alt:  900 },
  { name: 'Portugal',             iso: 620, lat:  39.40, lon:  -8.22, alt:  700 },
  { name: 'Romania',              iso: 642, lat:  45.94, lon:  24.97, alt:  700 },
  { name: 'Russia',               iso: 643, lat:  61.52, lon: 105.32, alt: 9000 },
  { name: 'Saudi Arabia',         iso: 682, lat:  23.89, lon:  45.08, alt: 2500 },
  { name: 'South Africa',         iso: 710, lat: -30.56, lon:  22.94, alt: 2000 },
  { name: 'South Korea',          iso: 410, lat:  35.91, lon: 127.77, alt:  700 },
  { name: 'Spain',                iso: 724, lat:  40.46, lon:  -3.75, alt: 1400 },
  { name: 'Sudan',                iso: 729, lat:  12.86, lon:  30.22, alt: 1800 },
  { name: 'Sweden',               iso: 752, lat:  60.13, lon:  18.64, alt: 1500 },
  { name: 'Switzerland',          iso: 756, lat:  46.82, lon:   8.23, alt:  400 },
  { name: 'Taiwan',               iso: 158, lat:  23.70, lon: 120.96, alt:  500 },
  { name: 'Thailand',             iso: 764, lat:  15.87, lon: 100.99, alt: 1200 },
  { name: 'Turkey',               iso: 792, lat:  38.96, lon:  35.24, alt: 1600 },
  { name: 'Ukraine',              iso: 804, lat:  48.38, lon:  31.17, alt: 1200 },
  { name: 'United Arab Emirates', iso: 784, lat:  23.42, lon:  53.85, alt:  600 },
  { name: 'United Kingdom',       iso: 826, lat:  55.38, lon:  -3.44, alt: 1200 },
  { name: 'United States',        iso: 840, lat:  37.09, lon: -95.71, alt: 6000 },
  { name: 'Venezuela',            iso: 862, lat:   6.42, lon: -66.59, alt: 1500 },
  { name: 'Vietnam',              iso: 704, lat:  14.06, lon: 108.28, alt: 1500 },
  { name: 'Yemen',                iso: 887, lat:  15.55, lon:  48.52, alt:  900 },
]

let _viewer   = null
let _onSelect = null
let _onClear  = null

export function initCountrySelector(viewer, { onSelect, onClear } = {}) {
  _viewer   = viewer
  _onSelect = onSelect
  _onClear  = onClear

  const input    = document.getElementById('country-input')
  const dropdown = document.getElementById('country-dropdown')
  if (!input || !dropdown) return

  function renderList(query) {
    const q = query.toLowerCase().trim()
    const matches = q ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q)) : COUNTRIES

    dropdown.innerHTML = ''
    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="country-empty">Nenhum país encontrado</div>'
      dropdown.classList.remove('hidden')
      return
    }

    matches.slice(0, 20).forEach(country => {
      const item = document.createElement('div')
      item.className = 'country-item'
      item.textContent = country.name
      item.addEventListener('mousedown', (e) => {
        e.preventDefault()
        selectCountry(country)
        input.value = country.name
        dropdown.classList.add('hidden')
      })
      dropdown.appendChild(item)
    })

    dropdown.classList.remove('hidden')
  }

  input.addEventListener('input', () => {
    if (!input.value.trim()) {
      clearHighlight()
      if (_onClear) _onClear()
    }
    renderList(input.value)
  })

  input.addEventListener('focus', () => renderList(input.value))

  input.addEventListener('blur', () => {
    setTimeout(() => dropdown.classList.add('hidden'), 150)
  })

  input.addEventListener('keydown', (e) => {
    const items  = dropdown.querySelectorAll('.country-item')
    const active = dropdown.querySelector('.country-item.hover')

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = active ? active.nextElementSibling : items[0]
      if (next) { active?.classList.remove('hover'); next.classList.add('hover') }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = active ? active.previousElementSibling : items[items.length - 1]
      if (prev) { active?.classList.remove('hover'); prev.classList.add('hover') }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active) active.dispatchEvent(new MouseEvent('mousedown'))
    } else if (e.key === 'Escape') {
      dropdown.classList.add('hidden')
      input.blur()
      clearHighlight()
      if (_onClear) _onClear()
      input.value = ''
    }
  })
}

function selectCountry(country) {
  if (!_viewer) return

  _viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(country.lon, country.lat, country.alt * 1000),
    orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
    duration: 2.0,
    easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
  })

  highlightCountry(country.iso)
  if (_onSelect) _onSelect(country)
}
