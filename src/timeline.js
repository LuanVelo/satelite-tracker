import * as Cesium from 'cesium'

const SPEEDS = [1, 60, 300, 1000]

export function initTimeline(viewer) {
  const btnPlay    = document.getElementById('btn-play')
  const btnRewind  = document.getElementById('btn-rewind')
  const btnForward = document.getElementById('btn-forward')
  const btnReset   = document.getElementById('btn-reset')
  const speedBtns  = document.querySelectorAll('.speed-btn')
  const slider     = document.getElementById('time-slider')
  const simTime    = document.getElementById('sim-time')

  let isPlaying = true
  let currentSpeed = 1
  const originTime = Cesium.JulianDate.now()

  // Play/Pause
  btnPlay.addEventListener('click', () => {
    isPlaying = !isPlaying
    viewer.clock.shouldAnimate = isPlaying
    btnPlay.textContent = isPlaying ? '⏸' : '▶'
  })

  // Rewind 30min
  btnRewind.addEventListener('click', () => {
    const offset = -30 * 60 // -30 min in seconds
    const t = Cesium.JulianDate.addSeconds(viewer.clock.currentTime, offset, new Cesium.JulianDate())
    viewer.clock.currentTime = t
    syncSlider(t)
  })

  // Forward 30min
  btnForward.addEventListener('click', () => {
    const offset = 30 * 60 // +30 min in seconds
    const t = Cesium.JulianDate.addSeconds(viewer.clock.currentTime, offset, new Cesium.JulianDate())
    viewer.clock.currentTime = t
    syncSlider(t)
  })

  // Reset to now
  btnReset.addEventListener('click', () => {
    const now = Cesium.JulianDate.now()
    viewer.clock.currentTime = now
    slider.value = 0
  })

  // Speed buttons
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseInt(btn.dataset.speed, 10)
      setSpeed(speed)
      speedBtns.forEach(b => b.classList.toggle('active', b === btn))
    })
  })

  // Slider: offset from "now" in minutes
  slider.addEventListener('input', () => {
    const offsetMin = parseInt(slider.value, 10)
    const t = Cesium.JulianDate.addSeconds(
      Cesium.JulianDate.now(),
      offsetMin * 60,
      new Cesium.JulianDate()
    )
    viewer.clock.currentTime = t
  })

  // Clock tick → update display and slider
  viewer.clock.onTick.addEventListener((clock) => {
    const date = Cesium.JulianDate.toDate(clock.currentTime)
    simTime.textContent = date.toUTCString().replace('GMT', 'UTC')
    syncSlider(clock.currentTime)
  })

  function syncSlider(julianDate) {
    const diffSec = Cesium.JulianDate.secondsDifference(julianDate, Cesium.JulianDate.now())
    const diffMin = Math.round(diffSec / 60)
    slider.value = Math.max(-720, Math.min(720, diffMin))
  }

  function setSpeed(speed) {
    currentSpeed = speed
    viewer.clock.multiplier = speed
  }
}
