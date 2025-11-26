// FRONTEND/controllers/env.js
// Global config for frontend

// CAMBIO IMPORTANTE:
// Usamos window.location.origin para obtener "http://IP:PUERTO" automáticamente.
// Si entras por localhost, será localhost. Si entras por IP, será la IP.
const API_URL = window.location.origin + '/api'

function getStoredUser() {
  try {
    const raw = window.localStorage.getItem('currentUser')
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    console.error('Error reading currentUser from localStorage', err)
    return null
  }
}

function setStoredUser(user) {
  try {
    if (!user) {
      window.localStorage.removeItem('currentUser')
      return
    }
    window.localStorage.setItem('currentUser', JSON.stringify(user))
  } catch (err) {
    console.error('Error saving currentUser to localStorage', err)
  }
}

function getCurrentUsername() {
  const user = getStoredUser()
  if (user && typeof user.username === 'string') {
    return user.username
  }
  return 'guest'
}

const CURRENT_USER = getCurrentUsername()

window.API_URL = API_URL
window.CURRENT_USER = CURRENT_USER
window.setStoredUser = setStoredUser
window.getStoredUser = getStoredUser