// FRONTEND/controllers/session_controller.js

document.addEventListener('DOMContentLoaded', () => {
  const logoutLinks = document.querySelectorAll('[data-action="logout"]')
  logoutLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault()
      logoutAndRedirect()
    })
  })

  const userLabel = document.getElementById('navUsernameLabel')
  if (userLabel && typeof getStoredUser === 'function') {
    const user = getStoredUser()
    if (user && user.username) {
      userLabel.textContent = 'Signed in as u/' + user.username
    } else {
      userLabel.textContent = 'Guest'
    }
  }
})

function logoutAndRedirect() {
  try {
    if (typeof setStoredUser === 'function') {
      setStoredUser(null)
    } else {
      window.localStorage.removeItem('currentUser')
    }
  } catch (err) {
    console.error('Error clearing currentUser', err)
  }
  window.location.href = './home_sin_auth.html'
}

window.logoutAndRedirect = logoutAndRedirect
