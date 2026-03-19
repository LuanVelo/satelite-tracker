import * as Cesium from 'cesium'
import * as satellite from 'satellite.js'

// In dev: use Vite proxy to bypass browser sandbox. In prod: call API directly (CORS is open).
const TLE_API = import.meta.env.DEV
  ? '/tleapi/api/tle/'
  : 'https://tle.ivanstanojevic.me/api/tle/'

const CATEGORY_CONFIG = {
  stations: { search: 'ISS',      size: 100 },
  starlink:  { search: 'STARLINK', size: 100 },
  gps:       { search: 'GPS',      size: 100 },
  weather:   { search: 'NOAA',     size: 100 },
  science:   { search: 'SENTINEL', size: 100 },
  military:  { search: 'COSMOS',   size: 100 },
}

const CATEGORY_COLORS = {
  stations: Cesium.Color.fromCssColorString('#69f0ae'),
  starlink:  Cesium.Color.fromCssColorString('#4fc3f7'),
  gps:       Cesium.Color.fromCssColorString('#ffeb3b'),
  weather:   Cesium.Color.fromCssColorString('#ce93d8'),
  science:   Cesium.Color.fromCssColorString('#ffab40'),
  military:  Cesium.Color.fromCssColorString('#ff4444'),
}

export const CATEGORY_CSS_COLORS = {
  stations: '#69f0ae',
  starlink:  '#4fc3f7',
  gps:       '#ffeb3b',
  weather:   '#ce93d8',
  science:   '#ffab40',
  military:  '#ff4444',
}

const CACHE_TTL      = 30 * 60 * 1000
const MAX_SATELLITES = 500
const TRACK_STEPS    = 120
const TRACK_STEP_SEC = 60

// ── Multi-category state ───────────────────────────────────────
// Map<category, { pointCollection, sats, entries: [{point,sat,idx}], color, cssColor }>
const _cats = new Map()

let _clickHandler    = null
let _tickHandler     = null
let _trackAbort      = false
let _trackPrimitives = []
let _tracksVisible   = true
let _viewer          = null
let _onSelect        = null

// ── Fetch ──────────────────────────────────────────────────────
async function fetchCategory(category) {
  const cacheKey = `tle_v4_${category}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { data, ts } = JSON.parse(cached)
    if (Date.now() - ts < CACHE_TTL) return data
  }

  const cfg = CATEGORY_CONFIG[category] ?? { search: category, size: 50 }
  const url = `${TLE_API}?search=${encodeURIComponent(cfg.search)}&page-size=${cfg.size}&sort=popularity&sort-dir=desc`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TLE API error ${res.status}`)

  const json = await res.json()
  const data = json.member ?? []
  // Only cache non-empty results to avoid persisting transient failures
  if (data.length > 0) {
    localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }))
  }
  return data
}

// ── Parse ──────────────────────────────────────────────────────
function buildSatRecords(members) {
  const sats = []
  for (const m of members) {
    if (!m.line1 || !m.line2) continue
    try {
      const satrec = satellite.twoline2satrec(m.line1, m.line2)
      if (satrec.error !== 0) continue
      sats.push({ name: m.name, tle1: m.line1, tle2: m.line2, satrec })
    } catch { }
  }
  return sats.slice(0, MAX_SATELLITES)
}

// ── Propagation ────────────────────────────────────────────────
export function getPosition(satrec, date) {
  const posVel = satellite.propagate(satrec, date)
  if (!posVel || !posVel.position) return null

  const gmst = satellite.gstime(date)
  const geo  = satellite.eciToGeodetic(posVel.position, gmst)

  return {
    lon:      satellite.degreesLong(geo.longitude),
    lat:      satellite.degreesLat(geo.latitude),
    alt:      geo.height,
    velocity: posVel.velocity,
    position: posVel.position,
  }
}

// ── TLE extended ───────────────────────────────────────────────
export function parseTLEExtended(tle1, tle2) {
  const noradId        = tle1.slice(2, 7).trim()
  const classification = tle1[7]?.trim() || 'U'
  const intlDesig      = tle1.slice(9, 17).trim()

  const launchYr2  = parseInt(intlDesig.slice(0, 2)) || 0
  const launchYear = launchYr2 >= 57 ? 1900 + launchYr2 : 2000 + launchYr2

  const epochRaw  = tle1.slice(18, 32).trim()
  const epochYr2  = parseInt(epochRaw.slice(0, 2))
  const epochDay  = parseFloat(epochRaw.slice(2))
  const epochYear = epochYr2 >= 57 ? 1900 + epochYr2 : 2000 + epochYr2
  const epochDate = new Date(Date.UTC(epochYear, 0, 1))
  epochDate.setUTCDate(epochDate.getUTCDate() + Math.floor(epochDay) - 1)

  const inclination  = parseFloat(tle2.slice(8, 16))
  const raan         = parseFloat(tle2.slice(17, 25))
  const eccStr       = tle2.slice(26, 33)
  const eccentricity = parseFloat('0.' + eccStr)
  const argPerigee   = parseFloat(tle2.slice(34, 42))
  const meanAnomaly  = parseFloat(tle2.slice(43, 51))
  const meanMotion   = parseFloat(tle2.slice(52, 63))
  const revNumber    = parseInt(tle2.slice(63, 68)) || 0

  const period        = meanMotion > 0 ? 1440 / meanMotion : 0
  const mu            = 398600.4418
  const n             = meanMotion * 2 * Math.PI / 86400
  const semiMajorAxis = Math.pow(mu / (n * n), 1 / 3)
  const earthRadius   = 6371
  const perigee = semiMajorAxis * (1 - eccentricity) - earthRadius
  const apogee  = semiMajorAxis * (1 + eccentricity) - earthRadius

  const classMap = { U: 'Não classificado', C: 'Classificado', S: 'Secreto' }

  return {
    noradId, inclination, raan, eccentricity, argPerigee,
    meanAnomaly, meanMotion, revNumber, period,
    semiMajorAxis, perigee, apogee,
    classification: classMap[classification] ?? classification,
    intlDesig, launchYear, epochDate,
  }
}

// ── Shared handlers ────────────────────────────────────────────
function rebuildTickHandler(viewer) {
  if (_tickHandler) viewer.clock.onTick.removeEventListener(_tickHandler)

  _tickHandler = (clock) => {
    const date = Cesium.JulianDate.toDate(clock.currentTime)
    for (const { entries } of _cats.values()) {
      for (const { point, sat } of entries) {
        const pos = getPosition(sat.satrec, date)
        if (!pos) continue
        point.position = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000)
      }
    }
  }
  viewer.clock.onTick.addEventListener(_tickHandler)
}

function rebuildClickHandler(viewer) {
  if (_clickHandler && !_clickHandler.isDestroyed()) _clickHandler.destroy()

  _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  _clickHandler.setInputAction((e) => {
    const picks = viewer.scene.drillPick(e.position, 10, 8, 8)
    for (const pick of picks) {
      if (pick?.id && typeof pick.id === 'object' && pick.id.cat !== undefined) {
        const { cat, idx } = pick.id
        const catState = _cats.get(cat)
        if (catState && _onSelect) {
          triggerSelect(viewer, catState.sats[idx], idx, cat, _onSelect)
          return
        }
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

// ── Add / Remove category ──────────────────────────────────────
export async function addCategory(viewer, category, onSelect, onListReady) {
  if (_cats.has(category)) return

  _viewer   = viewer
  _onSelect = onSelect

  const members = await fetchCategory(category)
  const sats    = buildSatRecords(members)
  const color    = CATEGORY_COLORS[category] ?? Cesium.Color.WHITE
  const cssColor = CATEGORY_CSS_COLORS[category] ?? '#4fc3f7'

  const pointCollection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection())
  const entries = []
  const now = new Date()

  for (let i = 0; i < sats.length; i++) {
    const pos = getPosition(sats[i].satrec, now)
    if (!pos) continue
    const point = pointCollection.add({
      position:     Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000),
      pixelSize:    5,
      color:        color,
      outlineColor: color.withAlpha(0.35),
      outlineWidth: 5,
      id: { cat: category, idx: i },
    })
    entries.push({ point, sat: sats[i], idx: i })
  }

  _cats.set(category, { pointCollection, sats, entries, color, cssColor })

  rebuildTickHandler(viewer)
  rebuildClickHandler(viewer)

  if (onListReady) onListReady()

  redrawAllTracks(viewer)
}

export function removeCategory(viewer, category) {
  const catState = _cats.get(category)
  if (!catState) return

  if (catState.pointCollection && !catState.pointCollection.isDestroyed()) {
    viewer.scene.primitives.remove(catState.pointCollection)
  }
  _cats.delete(category)

  if (_cats.size > 0) {
    rebuildTickHandler(viewer)
    rebuildClickHandler(viewer)
    redrawAllTracks(viewer)
  } else {
    if (_tickHandler) {
      viewer.clock.onTick.removeEventListener(_tickHandler)
      _tickHandler = null
    }
    if (_clickHandler && !_clickHandler.isDestroyed()) {
      _clickHandler.destroy()
      _clickHandler = null
    }
    clearTracks(viewer)
  }
}

export function clearAllCategories(viewer) {
  _trackAbort = true
  for (const catState of _cats.values()) {
    if (catState.pointCollection && !catState.pointCollection.isDestroyed()) {
      viewer.scene.primitives.remove(catState.pointCollection)
    }
  }
  _cats.clear()
  if (_tickHandler) { viewer.clock.onTick.removeEventListener(_tickHandler); _tickHandler = null }
  if (_clickHandler && !_clickHandler.isDestroyed()) { _clickHandler.destroy(); _clickHandler = null }
  clearTracks(viewer)
}

// ── Query active satellites ────────────────────────────────────
export function getAllSatEntries() {
  const result = []
  for (const [category, { sats, cssColor }] of _cats.entries()) {
    for (let i = 0; i < sats.length; i++) {
      result.push({ sat: sats[i], category, localIdx: i, cssColor })
    }
  }
  return result
}

export function getSatelliteCount() {
  let total = 0
  for (const { sats } of _cats.values()) total += sats.length
  return total
}

// ── Programmatic select ────────────────────────────────────────
export function selectSatelliteByIndex(viewer, category, localIdx, onSelect) {
  const catState = _cats.get(category)
  const sat = catState?.sats[localIdx]
  if (!sat) return
  triggerSelect(viewer, sat, localIdx, category, onSelect)
}

function triggerSelect(viewer, sat, idx, category, onSelect) {
  const pos = getPosition(sat.satrec, Cesium.JulianDate.toDate(viewer.clock.currentTime))
  if (!pos) return

  const speed = pos.velocity
    ? Math.sqrt(pos.velocity.x ** 2 + pos.velocity.y ** 2 + pos.velocity.z ** 2)
    : 0

  const extended = parseTLEExtended(sat.tle1, sat.tle2)
  onSelect({
    name: sat.name, tle1: sat.tle1, tle2: sat.tle2,
    altitude: pos.alt, velocity: speed,
    listIdx: idx, category,
    ...extended,
  })
}

// ── Orbital tracks ─────────────────────────────────────────────
function redrawAllTracks(viewer) {
  _trackAbort = true
  clearTracks(viewer)
  if (!_tracksVisible) return

  _trackAbort = false
  const catEntries = [..._cats.entries()]
  const tracksPerCat = Math.max(3, Math.floor(30 / Math.max(1, catEntries.length)))

  for (const [, { sats, color }] of catEntries) {
    drawTracks(viewer, sats.slice(0, tracksPerCat), color)
  }
}

export function drawTracks(viewer, sats, color) {
  const trackColor = color.withAlpha(0.65)
  const batchSize  = 5
  let   idx        = 0

  function processBatch() {
    if (_trackAbort) return
    const end = Math.min(idx + batchSize, sats.length)
    const now = new Date()

    for (let i = idx; i < end; i++) {
      const segments = [[]]
      let prevLon = null

      for (let s = 0; s <= TRACK_STEPS; s++) {
        const date = new Date(now.getTime() + s * TRACK_STEP_SEC * 1000)
        const pos  = getPosition(sats[i].satrec, date)
        if (!pos) continue

        if (prevLon !== null && Math.abs(pos.lon - prevLon) > 120) segments.push([])
        segments[segments.length - 1].push(
          Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000)
        )
        prevLon = pos.lon
      }

      for (const seg of segments) {
        if (seg.length < 3) continue
        const entity = viewer.entities.add({
          polyline: {
            positions:     seg,
            width:         2,
            material:      new Cesium.ColorMaterialProperty(trackColor),
            arcType:       Cesium.ArcType.NONE,
            clampToGround: false,
          }
        })
        entity.show = _tracksVisible
        _trackPrimitives.push(entity)
      }
    }

    idx = end
    if (idx < sats.length) setTimeout(processBatch, 0)
  }

  setTimeout(processBatch, 0)
}

function clearTracks(viewer) {
  for (const e of _trackPrimitives) viewer.entities.remove(e)
  _trackPrimitives = []
}

export function setTracksVisible(visible) {
  _tracksVisible = visible
  if (visible && _viewer && _cats.size > 0 && _trackPrimitives.length === 0) {
    redrawAllTracks(_viewer)
  } else {
    for (const e of _trackPrimitives) e.show = visible
  }
}

export function getTracksVisible() {
  return _tracksVisible
}
