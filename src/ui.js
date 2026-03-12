// ── Satellite info panel ─────────────────────────────────────
export function showSatelliteInfo(data) {
  const empty   = document.getElementById('sat-info')
  const details = document.getElementById('sat-details')

  empty.classList.add('hidden')
  details.classList.remove('hidden')

  document.getElementById('sat-name').textContent  = data.name
  document.getElementById('sat-norad').textContent = `NORAD #${data.noradId}`
  document.getElementById('stat-alt').innerHTML    = `${data.altitude.toFixed(0)} <small>km</small>`
  document.getElementById('stat-vel').innerHTML    = `${data.velocity.toFixed(2)} <small>km/s</small>`
  document.getElementById('stat-inc').innerHTML    = `${data.inclination.toFixed(1)}<small>°</small>`
  document.getElementById('stat-per').innerHTML    = `${data.period.toFixed(1)} <small>min</small>`
}

export function clearSatelliteInfo() {
  document.getElementById('sat-info').classList.remove('hidden')
  document.getElementById('sat-details').classList.add('hidden')
}

// ── Passes panel ─────────────────────────────────────────────
export function showPasses(passes, lat, lon) {
  const empty = document.getElementById('passes-info')
  const list  = document.getElementById('passes-list')

  if (!passes || passes.length === 0) {
    empty.classList.remove('hidden')
    list.classList.add('hidden')
    empty.querySelector('p').textContent = 'Nenhuma passagem encontrada nas próximas 24h'
    return
  }

  empty.classList.add('hidden')
  list.classList.remove('hidden')
  list.innerHTML = ''

  passes.forEach(pass => {
    const item = document.createElement('div')
    item.className = 'pass-item'

    const timeStr = pass.start.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'UTC',
    })
    const dateStr = pass.start.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit',
      timeZone: 'UTC',
    })

    item.innerHTML = `
      <span class="pass-sat-name">${pass.sat}</span>
      <span class="pass-time">${dateStr} ${timeStr} UTC</span>
      <span class="pass-elevation">Elevação máx: ${pass.maxElevation.toFixed(1)}°</span>
    `
    list.appendChild(item)
  })
}

export function clearPasses() {
  document.getElementById('passes-info').classList.remove('hidden')
  document.getElementById('passes-list').classList.add('hidden')
}

// ── Satellite counter ────────────────────────────────────────
export function updateCounter(count) {
  document.getElementById('sat-count').textContent = count
}

// ── Wall clock ───────────────────────────────────────────────
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
