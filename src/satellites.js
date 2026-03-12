import * as Cesium from 'cesium'
import * as satellite from 'satellite.js'

// TLE API — CORS-friendly, returns fresh TLEs as JSON
const TLE_API = 'https://tle.ivanstanojevic.me/api/tle/'

// Search terms and NORAD IDs per category
const CATEGORY_CONFIG = {
  stations: { search: 'ISS',      size: 10  },
  starlink:  { search: 'STARLINK', size: 100 },
  gps:       { search: 'GPS',      size: 50  },
  weather:   { search: 'NOAA',     size: 30  },
  science:   { search: 'HUBBLE',   size: 20  },
  // Publicly tracked military/government satellites (unclassified TLEs only)
  military:  { search: 'COSMOS',   size: 80  },
}

const CATEGORY_COLORS = {
  stations: Cesium.Color.fromCssColorString('#69f0ae'),
  starlink:  Cesium.Color.fromCssColorString('#4fc3f7'),
  gps:       Cesium.Color.fromCssColorString('#ffeb3b'),
  weather:   Cesium.Color.fromCssColorString('#ce93d8'),
  science:   Cesium.Color.fromCssColorString('#ffab40'),
  military:  Cesium.Color.fromCssColorString('#ff4444'),
}

const CACHE_TTL = 30 * 60 * 1000 // 30 min

const MAX_SATELLITES = 500

// Track rendering config
const TRACK_STEPS    = 120          // 2h @ 60s steps
const TRACK_STEP_SEC = 60

// Module state
let _pointCollection = null
let _trackPrimitives = []           // Cesium.Polyline primitives for tracks
let _clickHandler    = null
let _tickHandler     = null
let _trackAbort      = false        // cancel in-progress track computation

export let currentSatData = []

// ── Fetch ─────────────────────────────────────────────────────

async function fetchCategory(category) {
  const cacheKey = `tle_v2_${category}`
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

  localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }))
  return data
}

// ── Parse ─────────────────────────────────────────────────────

function buildSatRecords(members) {
  const sats = []
  for (const m of members) {
    if (!m.line1 || !m.line2) continue
    try {
      const satrec = satellite.twoline2satrec(m.line1, m.line2)
      if (satrec.error !== 0) continue
      sats.push({ name: m.name, tle1: m.line1, tle2: m.line2, satrec })
    } catch {
      // skip malformed TLE
    }
  }
  return sats.slice(0, MAX_SATELLITES)
}

// ── Propagation ───────────────────────────────────────────────

export function getPosition(satrec, date) {
  const posVel = satellite.propagate(satrec, date)
  if (!posVel || !posVel.position) return null

  const gmst = satellite.gstime(date)
  const geo  = satellite.eciToGeodetic(posVel.position, gmst)

  return {
    lon:      satellite.degreesLong(geo.longitude),
    lat:      satellite.degreesLat(geo.latitude),
    alt:      geo.height,   // km above WGS84
    velocity: posVel.velocity,
    position: posVel.position,
  }
}

// ── Main: load category ───────────────────────────────────────

export async function loadSatellites(viewer, category, onSelect) {
  clearSatellites(viewer)

  const members = await fetchCategory(category)
  const sats    = buildSatRecords(members)
  currentSatData = sats

  const color = CATEGORY_COLORS[category] ?? Cesium.Color.WHITE

  // PointPrimitiveCollection is faster than Entity-based points
  _pointCollection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection())

  const entries = [] // { point, sat }
  const now = new Date()

  for (let i = 0; i < sats.length; i++) {
    const pos = getPosition(sats[i].satrec, now)
    if (!pos) continue

    const point = _pointCollection.add({
      position:     Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000),
      pixelSize:    5,
      color:        color,
      outlineColor: color.withAlpha(0.35),
      outlineWidth: 5,
      id: i,
    })
    entries.push({ point, sat: sats[i] })
  }

  // Real-time position update on every clock tick
  _tickHandler = (clock) => {
    const date = Cesium.JulianDate.toDate(clock.currentTime)
    for (const { point, sat } of entries) {
      const pos = getPosition(sat.satrec, date)
      if (!pos) continue
      point.position = Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000)
    }
  }
  viewer.clock.onTick.addEventListener(_tickHandler)

  // Click to select satellite
  // Uses drillPick to pass through track polylines and find the point primitive
  _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  _clickHandler.setInputAction((e) => {
    // drillPick goes through all overlapping picks — finds our point even under track lines
    const picks = viewer.scene.drillPick(e.position, 10, 8, 8)

    // picked.primitive is the PointPrimitive itself (not the collection)
    // our satellite points have numeric ids; entity/polyline picks have object ids
    let idx = undefined
    for (const pick of picks) {
      if (pick && typeof pick.id === 'number') {
        idx = pick.id
        break
      }
    }
    if (idx === undefined) return

    const sat = sats[idx]
    if (!sat) return

    const pos = getPosition(sat.satrec, Cesium.JulianDate.toDate(viewer.clock.currentTime))
    if (!pos) return

    const speed = pos.velocity
      ? Math.sqrt(pos.velocity.x ** 2 + pos.velocity.y ** 2 + pos.velocity.z ** 2)
      : 0

    const noradId     = sat.tle1.slice(2, 7).trim()
    const inclination = parseFloat(sat.tle2.slice(8, 16))
    const meanMotion  = parseFloat(sat.tle2.slice(52, 63))
    const period      = meanMotion > 0 ? 1440 / meanMotion : 0

    onSelect({ name: sat.name, noradId, altitude: pos.alt, velocity: speed, inclination, period })
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  // Draw orbital tracks (non-blocking)
  drawTracks(viewer, sats, color)

  return sats
}

// ── Orbital tracks ────────────────────────────────────────────

/**
 * Compute and draw 2h orbital tracks for all satellites in batches.
 * Uses yield-to-browser (setTimeout 0) to avoid blocking the UI thread.
 */
export function drawTracks(viewer, sats, color) {
  _trackAbort = false
  clearTracks(viewer)

  const trackColor = color.withAlpha(0.65)
  const batchSize  = 5
  let   idx        = 0

  function processBatch() {
    if (_trackAbort) return

    const end = Math.min(idx + batchSize, sats.length)
    const now = new Date()

    for (let i = idx; i < end; i++) {
      const segments = [[]]   // array of position-arrays, one per segment
      let   prevLon  = null

      for (let s = 0; s <= TRACK_STEPS; s++) {
        const date = new Date(now.getTime() + s * TRACK_STEP_SEC * 1000)
        const pos  = getPosition(sats[i].satrec, date)
        if (!pos) continue

        // New segment when longitude wraps (avoids lines crossing the globe)
        const seg = segments[segments.length - 1]
        if (prevLon !== null && Math.abs(pos.lon - prevLon) > 120) {
          segments.push([])
        }
        segments[segments.length - 1].push(
          Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000)
        )
        prevLon = pos.lon
      }

      for (const seg of segments) {
        if (seg.length < 3) continue
        const entity = viewer.entities.add({
          polyline: {
            positions:         seg,
            width:             2,
            material:          new Cesium.ColorMaterialProperty(trackColor),
            arcType:           Cesium.ArcType.NONE,
            clampToGround:     false,
          }
        })
        _trackPrimitives.push(entity)
      }
    }

    idx = end
    if (idx < sats.length) setTimeout(processBatch, 0)
  }

  setTimeout(processBatch, 0)
}

function clearTracks(viewer) {
  for (const e of _trackPrimitives) {
    viewer.entities.remove(e)
  }
  _trackPrimitives = []
}

// ── Cleanup ───────────────────────────────────────────────────

export function clearSatellites(viewer) {
  _trackAbort = true
  if (_tickHandler) {
    viewer.clock.onTick.removeEventListener(_tickHandler)
    _tickHandler = null
  }
  if (_pointCollection && !_pointCollection.isDestroyed()) {
    viewer.scene.primitives.remove(_pointCollection)
    _pointCollection = null
  }
  if (_clickHandler && !_clickHandler.isDestroyed()) {
    _clickHandler.destroy()
    _clickHandler = null
  }
  clearTracks(viewer)
  currentSatData = []
}

export function getSatelliteCount() {
  return currentSatData.length
}
