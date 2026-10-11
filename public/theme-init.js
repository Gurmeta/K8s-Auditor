(function () {
  var stored = null
  try {
    stored = localStorage.getItem('theme')
  } catch {}
  document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light')
})()
