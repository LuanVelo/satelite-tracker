import * as Cesium from 'cesium'
import { feature } from 'topojson-client'

const COUNTRIES_110M = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const BORDER_COLOR = Cesium.Color.fromCssColorString('#4fc3f7').withAlpha(0.80)
const BORDER_MAT   = new Cesium.ColorMaterialProperty(BORDER_COLOR)

let _viewer    = null
let _topoCache = null      // cached raw topojson
let _geoCache  = null      // cached GeoJSON features
let _activeEntities = []   // currently displayed border entities

// ── Init ─────────────────────────────────────────────────────

export async function initBorders(viewer) {
  _viewer = viewer
  // Pre-load and cache the topojson so first search is instant
  try {
    await loadTopo()
  } catch (err) {
    console.warn('[borders] preload failed:', err)
  }
}

async function loadTopo() {
  if (_geoCache) return _geoCache
  const topo = await fetch(COUNTRIES_110M).then(r => r.json())
  _topoCache = topo
  _geoCache  = feature(topo, topo.objects.countries)
  return _geoCache
}

// ── Public API ────────────────────────────────────────────────

/**
 * Highlight a single country by ISO 3166-1 numeric code.
 * Clears any previous highlight first.
 */
export async function highlightCountry(isoNumeric) {
  clearHighlight()
  if (!_viewer || !isoNumeric) return

  const geo = await loadTopo()
  // feature.id is the numeric ISO code (string, may be zero-padded to 3 digits)
  const target = String(isoNumeric).padStart(3, '0')
  const match  = geo.features.find(f => String(f.id).padStart(3, '0') === target)
  if (!match) return

  _activeEntities = addCountryBorder(_viewer, match)
}

export function clearHighlight() {
  if (!_viewer) return
  for (const e of _activeEntities) _viewer.entities.remove(e)
  _activeEntities = []
}

// ── Draw one country's border as polyline entities ────────────

function addCountryBorder(viewer, geojsonFeature) {
  const entities = []
  const geom     = geojsonFeature?.geometry
  if (!geom) return entities

  const rings = geom.type === 'Polygon'
    ? [geom.coordinates[0]]
    : geom.type === 'MultiPolygon'
      ? geom.coordinates.map(p => p[0])
      : []

  for (const ring of rings) {
    if (ring.length < 2) continue

    // Segment at antimeridian crossings
    const segments = [[]]
    let prevLon = null
    for (const [lon, lat] of ring) {
      if (prevLon !== null && Math.abs(lon - prevLon) > 120) segments.push([])
      segments[segments.length - 1].push(
        Cesium.Cartesian3.fromDegrees(lon, lat, 0)
      )
      prevLon = lon
    }

    for (const seg of segments) {
      if (seg.length < 2) continue
      const entity = viewer.entities.add({
        polyline: {
          positions:     seg,
          width:         2.0,
          material:      BORDER_MAT,
          arcType:       Cesium.ArcType.NONE,
          clampToGround: false,
        }
      })
      entities.push(entity)
    }
  }

  return entities
}
