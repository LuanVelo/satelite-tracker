export function initFilters(onCategoryChange) {
  const buttons = document.querySelectorAll('.filter-btn')

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category

      // Update active state
      buttons.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')

      onCategoryChange(category)
    })
  })

  // Return initial category
  const activeBtn = document.querySelector('.filter-btn.active')
  return activeBtn?.dataset.category ?? 'stations'
}
