import * as Cesium from 'cesium'

// No Ion token needed — all assets served locally via vite-plugin-cesium
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyMjY0NDE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk'

export function initGlobe() {
  // Create viewer synchronously — no async imagery provider needed at init time
  const viewer = new Cesium.Viewer('cesium-container', {
    terrainProvider:         new Cesium.EllipsoidTerrainProvider(), // no Ion terrain needed
    baseLayerPicker:         false,
    geocoder:                false,
    homeButton:              false,
    sceneModePicker:         false,
    navigationHelpButton:    false,
    animation:               false,
    timeline:                false,
    fullscreenButton:        false,
    vrButton:                false,
    infoBox:                 false,
    selectionIndicator:      false,
    creditContainer:         document.createElement('div'),
    skyAtmosphere:           new Cesium.SkyAtmosphere(),
    skyBox: new Cesium.SkyBox({
      sources: {
        positiveX: Cesium.buildModuleUrl('Assets/Textures/SkyBox/tycho2t3_80_px.jpg'),
        negativeX: Cesium.buildModuleUrl('Assets/Textures/SkyBox/tycho2t3_80_mx.jpg'),
        positiveY: Cesium.buildModuleUrl('Assets/Textures/SkyBox/tycho2t3_80_py.jpg'),
        negativeY: Cesium.buildModuleUrl('Assets/Textures/SkyBox/tycho2t3_80_my.jpg'),
        positiveZ: Cesium.buildModuleUrl('Assets/Textures/SkyBox/tycho2t3_80_pz.jpg'),
        negativeZ: Cesium.buildModuleUrl('Assets/Textures/SkyBox/tycho2t3_80_mz.jpg'),
      }
    }),
  })

  // Remove default imagery layer — we'll layer our own below
  viewer.imageryLayers.removeAll()

  // Layer 1 (base): NaturalEarthII — offline, instant load at globe-level zoom
  Cesium.TileMapServiceImageryProvider.fromUrl(
    Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
  ).then(provider => {
    const layer = viewer.imageryLayers.addImageryProvider(provider)
    layer.brightness = 0.35
    layer.contrast   = 1.3
    layer.saturation = 0.04
  }).catch(() => {
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1828')
  })

  // Layer 2 (detail): Esri World Imagery — tiled satellite photos, loads on zoom
  // Free, no API key required, CORS-enabled
  Cesium.ArcGisMapServerImageryProvider.fromUrl(
    'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
  ).then(provider => {
    const layer = viewer.imageryLayers.addImageryProvider(provider)
    layer.brightness = 0.45
    layer.contrast   = 1.2
    layer.saturation = 0.15
    layer.alpha      = 0.0  // transparent at globe level

    // Fade in the detail layer as camera zooms closer
    viewer.scene.preRender.addEventListener(() => {
      const cameraAlt = viewer.camera.positionCartographic?.height ?? 1e8
      // Full opacity below 2 000 km, fully transparent above 8 000 km
      const lo = 1_500_000, hi = 14_000_000
      layer.alpha = Math.max(0, Math.min(1, 1 - (cameraAlt - lo) / (hi - lo)))
    })
  }).catch(() => { /* Esri unavailable — NaturalEarthII base is sufficient */ })

  // Globe settings — lighting + atmosphere define the sphere silhouette
  viewer.scene.globe.enableLighting       = true
  viewer.scene.globe.showGroundAtmosphere = true
  viewer.scene.fog.enabled                = false
  viewer.scene.globe.baseColor            = Cesium.Color.fromCssColorString('#0a1828')

  // Atmosphere — strong blue rim glow defines the sphere edge
  viewer.scene.skyAtmosphere.hueShift        = -0.08
  viewer.scene.skyAtmosphere.saturationShift =  0.2
  viewer.scene.skyAtmosphere.brightnessShift = -0.1

  // Default camera: full globe view
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(0, 20, 22_000_000)
  })

  // Clock
  viewer.clock.shouldAnimate  = true
  viewer.clock.multiplier     = 1
  viewer.clock.currentTime    = Cesium.JulianDate.now()

  return viewer
}
