// ── NASA image fetch ───────────────────────────────────────────

async function fetchSatelliteImage(name) {
  try {
    const queries = buildImageQueries(name)
    for (const query of queries) {
      const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`
      const res = await fetch(url)
      if (!res.ok) continue
      const json  = await res.json()
      const items = json.collection?.items ?? []
      for (const item of items) {
        const preview = item.links?.find(l => l.rel === 'preview' && l.render === 'image')
        if (preview?.href) return preview.href
      }
    }
    return null
  } catch {
    return null
  }
}

function buildImageQueries(name) {
  const n = name.toUpperCase()
  if (n.includes('ISS') || n.includes('ZARYA') || n.includes('NAUKA'))
    return ['International Space Station ISS']
  if (n.includes('STARLINK')) return ['Starlink satellite']
  if (n.includes('GPS') || n.includes('NAVSTAR')) return ['GPS satellite navigation']
  if (n.includes('NOAA')) return ['NOAA weather satellite']
  if (n.includes('HUBBLE')) return ['Hubble Space Telescope']
  if (n.includes('COSMOS')) return ['satellite orbit']

  const simplified = name
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[-_]\d+$/, '')
    .replace(/\s+\d+$/, '')
    .trim()
  return simplified.length > 2
    ? [simplified, 'satellite orbit space']
    : ['satellite orbit space']
}

// ── Satellite detail panel ────────────────────────────────────

let _activeListCat     = null
let _activeListLocalIdx = -1

export function showSatelliteInfo(data) {
  if (!data) { closeSatellitePanel(); return }
  _activeListCat      = data.category ?? null
  _activeListLocalIdx = data.listIdx ?? -1

  const panel = document.getElementById('panel-left')
  panel.classList.remove('panel-left-hidden')

  document.getElementById('sat-details').classList.remove('hidden')

  document.getElementById('sat-name').textContent   = data.name
  document.getElementById('sat-norad').textContent  = `NORAD #${data.noradId}`
  document.getElementById('stat-alt').innerHTML     = `${data.altitude.toFixed(0)} <small>km</small>`
  document.getElementById('stat-vel').innerHTML     = `${data.velocity.toFixed(2)} <small>km/s</small>`
  document.getElementById('stat-inc').innerHTML     = `${data.inclination.toFixed(1)}<small>°</small>`
  document.getElementById('stat-per').innerHTML     = `${data.period.toFixed(1)} <small>min</small>`

  document.getElementById('stat-sma').textContent   = `${data.semiMajorAxis.toFixed(0)} km`
  document.getElementById('stat-ecc').textContent   = data.eccentricity.toFixed(7)
  document.getElementById('stat-raan').textContent  = `${data.raan.toFixed(3)}°`
  document.getElementById('stat-arg').textContent   = `${data.argPerigee.toFixed(3)}°`
  document.getElementById('stat-ma').textContent    = `${data.meanAnomaly.toFixed(3)}°`
  document.getElementById('stat-peri').textContent  = `${data.perigee.toFixed(0)} km`
  document.getElementById('stat-apo').textContent   = `${data.apogee.toFixed(0)} km`

  document.getElementById('stat-class').textContent  = data.classification
  document.getElementById('stat-intl').textContent   = data.intlDesig || '—'
  document.getElementById('stat-launch').textContent = data.launchYear ?? '—'
  document.getElementById('stat-epoch').textContent  = data.epochDate
    ? data.epochDate.toISOString().slice(0, 10) : '—'
  document.getElementById('stat-rev').textContent    = data.revNumber ?? '—'

  highlightListItem(_activeListCat, _activeListLocalIdx)

  const img         = document.getElementById('sat-image')
  const placeholder = document.getElementById('sat-image-placeholder')
  img.classList.remove('loaded')
  img.src = ''
  placeholder.style.display = 'flex'

  fetchSatelliteImage(data.name).then(url => {
    if (!url) return
    img.onload = () => { img.classList.add('loaded'); placeholder.style.display = 'none' }
    img.src = url
  })
}

export function closeSatellitePanel() {
  const panel = document.getElementById('panel-left')
  panel.classList.add('panel-left-hidden')
  highlightListItem(null, -1)
  _activeListCat = null
  _activeListLocalIdx = -1
}

// ── Satellite list (right panel) ──────────────────────────────

const CATEGORY_LABELS = {
  stations: 'ESTAÇÕES', starlink: 'STARLINK', gps: 'GPS',
  weather: 'METEOROLÓGICOS', science: 'CIENTÍFICOS', military: 'MILITARES',
}

export function renderSatelliteList(satEntries, onItemClick) {
  const listEl   = document.getElementById('sat-list')
  const emptyEl  = document.getElementById('sat-list-empty')
  const countEl  = document.getElementById('sat-list-count')

  countEl.textContent = satEntries.length

  if (!satEntries || satEntries.length === 0) {
    listEl.classList.add('hidden')
    emptyEl.classList.remove('hidden')
    emptyEl.querySelector('p').textContent = 'Nenhum satélite carregado'
    return
  }

  emptyEl.classList.add('hidden')
  listEl.classList.remove('hidden')
  listEl.innerHTML = ''

  // Group by category
  const groups = new Map()
  for (const entry of satEntries) {
    if (!groups.has(entry.category)) groups.set(entry.category, [])
    groups.get(entry.category).push(entry)
  }

  for (const [category, entries] of groups.entries()) {
    const catCssColor = entries[0].cssColor

    // Category header row
    const header = document.createElement('div')
    header.className = 'sat-list-category-header'
    header.style.setProperty('--item-color', catCssColor)
    header.innerHTML = `
      <span class="sat-list-cat-dot"></span>
      <span class="sat-list-cat-label">${CATEGORY_LABELS[category] ?? category.toUpperCase()}</span>
      <span class="sat-list-cat-count">${entries.length}</span>
    `
    listEl.appendChild(header)

    for (const { sat, category: cat, localIdx, cssColor } of entries) {
      const noradId = sat.tle1?.slice(2, 7).trim() ?? '—'
      const item = document.createElement('div')
      item.className = 'sat-list-item'
      item.dataset.cat      = cat
      item.dataset.localIdx = localIdx
      item.style.setProperty('--item-color', cssColor)
      item.innerHTML = `
        <span class="sat-list-dot"></span>
        <span class="sat-list-info">
          <span class="sat-list-name">${sat.name}</span>
          <span class="sat-list-norad">NORAD #${noradId}</span>
        </span>
      `
      item.addEventListener('click', () => onItemClick(cat, localIdx))
      listEl.appendChild(item)
    }
  }
}

function highlightListItem(cat, localIdx) {
  const listEl = document.getElementById('sat-list')
  if (!listEl) return
  listEl.querySelectorAll('.sat-list-item').forEach(el => {
    el.classList.toggle('active',
      cat !== null && el.dataset.cat === cat && parseInt(el.dataset.localIdx) === localIdx
    )
  })
}

// ── Counter ───────────────────────────────────────────────────
export function updateCounter(count) {
  document.getElementById('sat-count').textContent = count
}

// ── Wall clock ────────────────────────────────────────────────
export function startWallClock() {
  function tick() {
    const now = new Date()
    document.getElementById('clock-time').textContent =
      now.toUTCString().slice(17, 25) + ' UTC'
    document.getElementById('clock-date').textContent =
      now.toLocaleDateString('pt-BR')
  }
  tick()
  setInterval(tick, 1000)
}

// ── Country Intel Panel ───────────────────────────────────────

let _intelCountry  = null
let _intelInterval = null
let _getSatsFn     = null

const OVERHEAD_RADIUS_KM = 2500

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function getOperatorNation(satName) {
  const n = satName.toUpperCase()
  if (/\bCOSMOS\b/.test(n) || n.includes('GLONASS') || n.includes('MOLNIYA')) return 'RÚSSIA'
  if (n.includes('STARLINK') || n.includes('GPS') || n.includes('NAVSTAR') ||
      n.startsWith('USA ') || n.includes('NOAA') || n.includes('GOES') ||
      n.includes('HUBBLE') || n.includes('AQUA') || n.includes('TERRA')) return 'EUA'
  if (n.includes('FENGYUN') || n.includes('YAOGAN') || n.includes('BEIDOU') ||
      n.includes('CHINASAT')) return 'CHINA'
  if (n.includes('ISS') || n.includes('ZARYA') || n.includes('NAUKA')) return 'MULTI-NAÇÃO'
  if (n.includes('SENTINEL') || n.includes('METEOSAT') || n.includes('AEOLUS')) return 'EUROPA'
  if (n.includes('INSAT') || n.includes('CARTOSAT') || n.includes('RISAT')) return 'ÍNDIA'
  if (n.includes('SPOT') || n.includes('PLÉIADES') || n.includes('HELIOS')) return 'FRANÇA'
  return null
}

export function initCountryIntel(getSatsFn) {
  _getSatsFn = getSatsFn
}

export function showCountryIntel(country) {
  _intelCountry = country
  const panel = document.getElementById('country-intel')
  panel.classList.remove('hidden')
  _updateIntel()
  if (_intelInterval) clearInterval(_intelInterval)
  _intelInterval = setInterval(_updateIntel, 4000)
}

export function hideCountryIntel() {
  _intelCountry = null
  document.getElementById('country-intel').classList.add('hidden')
  if (_intelInterval) { clearInterval(_intelInterval); _intelInterval = null }
}

function _updateIntel() {
  if (!_intelCountry || !_getSatsFn) return

  const { lat, lon, name } = _intelCountry
  const sats = _getSatsFn()

  // Filter overhead
  const overhead = sats.filter(s => {
    if (!s.pos) return false
    return haversineKm(s.pos.lat, s.pos.lon, lat, lon) < OVERHEAD_RADIUS_KM
  })

  // Count by operator nation
  const nations = new Map()
  for (const s of overhead) {
    const nation = getOperatorNation(s.name)
    if (!nation) continue
    nations.set(nation, (nations.get(nation) ?? 0) + 1)
  }

  // Sort descending
  const sorted = [...nations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Update DOM
  document.getElementById('intel-country-name').textContent = name.toUpperCase()
  document.getElementById('intel-sat-count').textContent = overhead.length

  const watchersEl = document.getElementById('intel-watchers')
  if (sorted.length === 0) {
    watchersEl.innerHTML = '<div class="ic-watcher-row"><span class="ic-watcher-name" style="color:rgba(255,255,255,0.25)">NENHUM DETECTADO</span></div>'
  } else {
    watchersEl.innerHTML = sorted.map(([nation, count]) => `
      <div class="ic-watcher-row">
        <span class="ic-watcher-sq"></span>
        <span class="ic-watcher-name">${nation}</span>
        <span class="ic-watcher-count">${count} SAT</span>
      </div>
    `).join('')
  }
}
