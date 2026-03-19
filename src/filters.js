export function initFilters(onCategoryToggle) {
  const buttons = document.querySelectorAll('.filter-btn')

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active')
      onCategoryToggle(btn.dataset.category, btn.classList.contains('active'))
    })
  })
}
