import * as Cesium from 'cesium'
import * as satellite from 'satellite.js'

let markerEntity = null
let pickerHandler = null

/**
 * Compute future passes of all satellites over a lat/lon point.
 * Scans the next 24h in 30s steps.
 */
export function computePasses(satDataArray, lat, lon, durationHours = 24) {
  const passes = []
  const now = new Date()
  const end = new Date(now.getTime() + durationHours * 3600 * 1000)
  const stepMs = 30 * 1000
  const minElevationDeg = 10

  const obsGd = {
    longitude: Cesium.Math.toRadians(lon),
    latitude:  Cesium.Math.toRadians(lat),
    height:    0 // km above WGS84
  }

  satDataArray.forEach(sat => {
    let inPass = false
    let passStart = null
    let maxEl = 0

    for (let t = now.getTime(); t < end.getTime(); t += stepMs) {
      const date = new Date(t)
      const posVel = satellite.propagate(sat.satrec, date)
      if (!posVel.position) continue

      const gmst = satellite.gstime(date)
      const lookAngles = satellite.ecfToLookAngles(obsGd, satellite.eciToEcf(posVel.position, gmst))
      const elevDeg = Cesium.Math.toDegrees(lookAngles.elevation)

      if (elevDeg >= minElevationDeg) {
        if (!inPass) {
          inPass = true
          passStart = date
          maxEl = elevDeg
        } else {
          maxEl = Math.max(maxEl, elevDeg)
        }
      } else {
        if (inPass) {
          passes.push({
            sat: sat.name,
            start: passStart,
            maxElevation: maxEl,
          })
          inPass = false
          if (passes.length >= 10) break
        }
      }
    }
    if (passes.length >= 20) return
  })

  return passes.sort((a, b) => a.start - b.start).slice(0, 10)
}

/**
 * Enable click-on-globe to drop a marker and compute passes.
 */
export function initLocationPicker(viewer, getSatData, onPasses) {
  if (pickerHandler) pickerHandler.destroy()

  pickerHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  pickerHandler.setInputAction((e) => {
    // Only act on globe surface — skip if a satellite point was clicked
    const picks = viewer.scene.drillPick(e.position, 5, 8, 8)
    const hitsSatellite = picks.some(p => p && typeof p.id === 'number')
    if (hitsSatellite) return

    const cartesian = viewer.scene.pickPosition(e.position)
    if (!Cesium.defined(cartesian)) return

    const carto = Cesium.Cartographic.fromCartesian(cartesian)
    const lat = Cesium.Math.toDegrees(carto.latitude)
    const lon = Cesium.Math.toDegrees(carto.longitude)

    // Place pulsing marker
    placeMarker(viewer, lat, lon)

    // Compute passes
    const satData = getSatData()
    const passes = computePasses(satData, lat, lon)
    onPasses(passes, lat, lon)
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function placeMarker(viewer, lat, lon) {
  if (markerEntity) viewer.entities.remove(markerEntity)

  markerEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
    point: {
      pixelSize: 10,
      color: Cesium.Color.WHITE.withAlpha(0.9),
      outlineColor: Cesium.Color.WHITE.withAlpha(0.3),
      outlineWidth: 8,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
    label: {
      text: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
      font: '11px "Space Mono", monospace',
      fillColor: Cesium.Color.fromCssColorString('#e8f0fe'),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -16),
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString('rgba(10,20,40,0.7)'),
    }
  })
}
